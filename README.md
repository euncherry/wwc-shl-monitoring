# 히어링루프 모니터링 프론트엔드

공공시설에 설치된 **ESP32 히어링루프 기기**의 상태를 모니터링·관리하는 웹 애플리케이션입니다.
NestJS 백엔드(AWS staging)와 **실연동**하며, 백엔드에 아직 없는 API는 **MSW 목(mock)** 으로 흉내 내는 하이브리드 구조입니다.

> 원본 프로토타입([`wwc-monitoring-platform`](./docs/README.original.md))의 UI를 그대로 재사용하되, **데이터 레이어만 실연동 + 목으로 교체**한 버전입니다.

**배포** : TBD (Vercel) · **백엔드** : `https://api.staging.smarthearingloop.com`

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework / Build | React 19 · Vite 7 · TypeScript |
| Styling | Tailwind CSS v4 (`@theme` 토큰) |
| Icons | lucide-react |
| Routing | react-router-dom v7 |
| 클라이언트/인증 상태 | **zustand** (persist) |
| 서버 상태 | **TanStack Query (React Query)** + axios |
| 목(mock) | **MSW (Mock Service Worker)** |
| 배포 / 계측 | Vercel · Vercel Analytics · Speed Insights |

---

## 아키텍처 — 실연동 + 목 하이브리드

```
컴포넌트 ──> TanStack Query 훅 ──> axios(apiClient) ──> ┌─ 실 staging API (NestJS)
                                                         └─ MSW 핸들러 (백엔드 미구현 API만 가로챔)
```

- 서버 데이터는 **항상 TanStack Query 훅**을 통해 접근합니다(컴포넌트에서 axios 직접 호출 금지).
- MSW는 **백엔드에 아직 없는 경로/필드만** 가로채고, 등록되지 않은 경로는 그대로 통과 → 실 staging 호출.
- 따라서 백엔드가 배포되면 **해당 MSW 핸들러만 제거**하면 실연동으로 전환됩니다.
- 인증·UI 상태는 zustand, 서버 데이터는 전부 TanStack Query로 분리.

자세한 REAL/MOCK 매핑은 [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) · [`docs/BACKEND_REQUIREMENTS.md`](./docs/BACKEND_REQUIREMENTS.md) 참고.

---

## 역할 & 데모 계정

| 역할 | 백엔드 role | 데이터 범위 | 메뉴 |
|------|------------|-------------|------|
| **관리자(admin)** | `ADMIN` | 전체 기관·기기 | 대시보드 · 히어링루프 관리 · 텔레코일존 관리 · 펌웨어 관리 · 알림센터 |
| **사용자(user)** | `ZONE_USER` | 소속 기관 기기만 | 대시보드 · 히어링루프 관리 · 정보관리 · 기술 지원 |

```
관리자 데모 계정 :  admin / admin1234   (백엔드 시드 계정)
```

> 사용자 계정은 관리자가 **텔레코일존 관리**에서 존+계정을 생성해야 만들어집니다.

**용어**: 텔레코일존 = 기관(동일 단위). 관리자 시점 "텔레코일존", 사용자 시점 "우리 기관". 기기 식별자는 **MAC 주소**(별칭 있으면 별칭이 메인 타이틀).

---

## 라우팅

```
/login                     로그인           (미인증)

/admin                     대시보드
/admin/hearing-loops       히어링루프 관리
/admin/telecoil-zones      텔레코일존 관리
/admin/firmware            펌웨어 관리
/admin/alerts              알림센터

/user                      대시보드
/user/hearing-loops        히어링루프 관리
/user/settings             정보관리
/user/support              기술 지원
```

> 원본 대비 제외: `/signup`(회원가입), `/admin/activity-log`(활동 로그), 대시보드 지도뷰, 기기 제어(전원/볼륨) — 모든 텔레메트리는 **조회 전용**.

---

## 구현 현황 (페이지 단위)

| 영역 | 상태 | 비고 |
|------|------|------|
| 로그인 / 인증 (JWT·역할분기) | ✅ 실연동 | `POST /auth/login`, `GET /users/me` |
| 관리자 · 히어링루프 관리 | ✅ 실연동 | 목록·상세·등록·삭제·별칭·존배정 실연동 / 전원·네트워크·볼륨·펌웨어버전·상태는 목·파생 |
| 관리자 · 텔레코일존 관리 | ✅ 실연동 | 존 CRUD·계정 생성/PW재설정·기기 배정 실연동 / 통합생성·주소·대표번호·담당자이메일은 목 |
| 관리자 · 펌웨어 관리 | ✅ 실연동 | 업로드·목록·개별 전송 실연동 / 설명(description)·전체전송은 목 |
| 관리자 · 알림센터 | 🚧 진행 예정 | 백엔드 알림 모듈 없음 → 전부 MSW 목 예정 |
| 관리자 · 대시보드 | 🚧 보류 | 명세 확정 대기 |
| 사용자 페이지 전체 | 🚧 미착수 | 관리자가 만든 실데이터 위에서 구현 예정 |

### ✅ 실연동 (REAL) — 백엔드에 실제로 존재

> 베이스 `VITE_API_BASE_URL` · 인증 `Authorization: Bearer {JWT}` (login 제외)

| 기능 | 엔드포인트 |
|------|-----------|
| 로그인 / 내 프로필 | `POST /auth/login` · `GET /users/me` |
| 사용자 계정 CRUD | `POST·GET·PATCH·DELETE /users` (아이디/이메일 수정, 중복 시 409) |
| 텔레코일존 CRUD | `POST·GET·PATCH·DELETE /zones` (생성은 `{ name }`만) |
| 텔레코일존 집계 | `GET /zones`가 `devices[] + user` 반환 → **기기 수·배정 기기·담당 계정 모두 실값** |
| 기기 등록 / 목록 / 상세 / 삭제 | `POST /devices`·`/devices/bulk` · `GET /devices`·`/devices/:mac` · `DELETE /devices/:id` |
| 기기 별칭(alias) | `PATCH /devices/:mac { alias }` (unique, 중복 시 409) — 관리자+소속 사용자 가능 |
| 기기 존 배정 | `PUT /devices/:id/zone/:zoneId` (경로 파라미터, body 없음, ADMIN) |
| 기기 상태 이력 | `GET /devices/:mac/status?page=&limit=` |
| 기기 **실값 필드** | MAC · 별칭(`alias`) · 소속 존 · **온도(`last_temperature`)** · **동작(`last_gpio_state`)** · `last_seen_at` · 등록일 |
| 펌웨어 | `POST /firmware`(업로드·409) · `GET /firmware`(목록) · `POST /firmware/:id/send/:mac`(개별 전송) |

### 🟡 목 (MOCK) — 백엔드에 없어 MSW로 흉내

| 항목 | 이유 / 처리 |
|------|------------|
| 기기 **전원(power)·네트워크(network)·볼륨(volume)** | StatusReport 미확장 → MSW가 기기 응답에 병합 |
| 기기별 **펌웨어 버전** | 엔티티에 저장 안 됨 → 목 병합 |
| 텔레코일존 **주소·대표번호** | Zone 엔티티에 필드 없음 |
| 담당자 **이메일(managerEmail)** | `zone.user`에 email 없음 → 목 (또는 `GET /users/:id` 보강) |
| 존+계정 **통합 생성** | 단일 엔드포인트 없음 → FE 오케스트레이션(`POST /zones` → `POST /users`) |
| 기기 **배정 해제** | 해제 엔드포인트 없음(`:zoneId` 필수) → 세션 오버라이드 목 |
| **정상 가동 수·가동률·존 상태** | MQTT heartbeat/`connection_status` 없음 → 목 기준 |
| 펌웨어 **설명(description)·전체 전송(broadcast)** | 엔티티/엔드포인트 없음 |
| **알림센터** 전체 | 백엔드 알림(Alert) 모듈 자체가 없음 |
| 담당자 **부서(department)** | User 엔티티에 필드 없음 |

### 🔵 파생 (DERIVED) — 실값으로 프론트가 계산

| 항목 | 규칙 |
|------|------|
| 상태 뱃지 `normal/warning/offline` | `last_seen_at`(기본 5분 임계값) + 온도 임계값으로 파생 — 백엔드 `status`(PENDING/ACTIVE)와 무관 |
| KPI / 가동률 집계 | `GET /devices`·`GET /zones` 결과를 프론트에서 집계 |

> 화면에서 목 값 옆에는 **'목' 배지**를 달아 실값과 구분합니다. 실값(온도·동작·별칭)에는 배지가 없습니다.
> 백엔드가 해당 API/필드를 배포하면 **MSW 핸들러와 '목' 배지만 제거**해 실연동으로 전환합니다.

#### ⚠️ 실값이지만 신뢰 주의

- **온도(`last_temperature`)** — 프로토콜상 현재 펌웨어가 **0.0 고정 전송** 가능성. 실 센서값 여부 확인 필요.
- **연결 상태(online/offline)** — `StatusReport`가 이벤트 기반(주기 heartbeat 없음)이라 `last_seen_at`만으로는 부정확. 정확한 online은 백엔드 `connection_status`(MQTT LWT/keepalive) 제공 필요.
- **error 상태** — `device_error_log` 엔티티는 있으나 조회 엔드포인트가 없어 `error` 상태는 파생하지 않음(현재 `normal/warning/offline`만).

---

## 로컬 실행

> Vite/빌드는 **Node 20.19+ / 22.12+** 필요 (이 레포는 nvm `Node 24` 사용).

```bash
nvm use 24          # 또는 Node 22.12+
npm install
npm run dev         # http://localhost:5173 (포트 고정 — 백엔드 CORS 허용 기준)

npm run build       # tsc -b && vite build
npm run preview     # 빌드 산출물 미리보기
```

### 환경 변수

`.env.example`를 참고해 `.env.development` / `.env.production`을 만듭니다. (`.env.*`는 git 제외 — Vercel에선 대시보드에서 설정)

| 키 | 설명 | dev | prod |
|----|------|-----|------|
| `VITE_API_BASE_URL` | 백엔드 베이스 URL | `https://api.staging.smarthearingloop.com` | `https://api.smarthearingloop.com` |
| `VITE_ENABLE_MOCK` | MSW 목 활성화 | `true` | `false` |

> ⚠️ **CORS**: 백엔드가 프론트 origin을 허용해야 호출됩니다. 새 배포 도메인(예: `*.vercel.app`)은 staging CORS 허용이 필요하며, 안 되면 **로그인부터 막힙니다**.

---

## 폴더 구조

```
src/
├── api/            # axios 인스턴스 + 엔드포인트 함수
├── hooks/          # TanStack Query 훅 (useDevices, useZones, useFirmware ...)
├── mocks/          # MSW 핸들러 (백엔드 미구현 API만)
├── components/layout/  # 레이아웃 · 라우트 가드 (원본 유지)
├── components/         # 공통 컴포넌트
├── pages/admin|user|auth/  # 페이지 (데이터 소스만 교체)
├── stores/         # zustand (authStore)
├── types/          # 뷰모델 + API 응답 타입
├── lib/            # cn(), 포매터, 매퍼, queryClient
└── index.css       # @theme 디자인 토큰
```

---

## 문서

| 문서 | 내용 |
|------|------|
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | 기능 요구사항 (단일 원천) |
| [`docs/BACKEND_REQUIREMENTS.md`](./docs/BACKEND_REQUIREMENTS.md) | 백엔드 확장 요청 항목 |
| [`docs/README.original.md`](./docs/README.original.md) | 원본 프로토타입 명세 (참고용, 화면 스크린샷 포함) |
| [`CLAUDE.md`](./CLAUDE.md) | 구현 원칙·연동 상태·단계별 진행 가이드 |
