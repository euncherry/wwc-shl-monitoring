# CLAUDE.md — 히어링루프 모니터링 프론트엔드

> **사용법**: 이 파일을 새 프론트엔드 repo 루트에 `CLAUDE.md`로 복사한다.
> 새 프론트는 `wwc-monitoring-platform`(원본)을 **복사한 뒤 데이터 레이어만 교체**해서 만든다.

---

## 1. 프로젝트 개요

공공시설에 설치된 ESP32 히어링루프 기기의 상태를 모니터링·관리하는 웹. NestJS 백엔드(AWS staging)와 실연동한다.

| 역할 | 백엔드 role | 데이터 범위 | 메뉴 |
|---|---|---|---|
| **관리자(admin)** | `ADMIN` | 전체 기관·기기 | 대시보드, 히어링루프 관리, 텔레코일존 관리, 펌웨어 관리, 알림센터 |
| **사용자(user)** | `ZONE_USER` | 소속 기관 기기만 | 대시보드, 히어링루프 관리, 정보관리, 기술 지원 |

---

## 2. 기술 스택

| 구분 | 기술 |
|---|---|
| Framework / Build | React 19 + Vite 7 + TypeScript |
| Styling | Tailwind CSS v4 (`@theme` 토큰, `@tailwindcss/vite`) |
| Icons | lucide-react |
| Routing | react-router-dom v7 |
| **클라이언트/인증 상태** | **zustand** (persist) |
| **서버 상태** | **TanStack Query (React Query) + axios** |
| **목(mock)** | **MSW (Mock Service Worker)** |

> 원본은 `data/*.ts`를 직접 import하는 mock 구조다. 이를 **TanStack Query 훅 → axios → staging(실연동) / MSW(목)** 로 교체한다.
> zustand는 인증·UI 상태에 그대로 사용, 서버 데이터는 전부 TanStack Query로.

---

## 3. 구현 원칙 (가장 중요)

1. **디자인 원천 = 원본(reference) 복사본.** 컴포넌트의 마크업·className·레이아웃은 **그대로 재사용**한다. **재디자인 금지.** 시각적 변경이 필요하면 먼저 확인받는다.
2. **기능/데이터 = 이 문서 + 백엔드 API**를 따른다.
3. **백엔드에 있는 API = 실연동(staging)**, **없는 API = MSW 목**으로 흉내내고 §10·§13에 명시. 프론트 코드는 항상 진짜 API를 호출하는 것처럼 작성하고, 목은 네트워크 레이어에서만 가로챈다 → 백엔드 배포 시 **핸들러 제거만으로 실연동 전환**.

---

## 4. 디자인 시스템

### 4-1. 토큰 (`src/index.css`의 `@theme` — 원본 그대로 유지)

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system, ... , sans-serif;

  /* Main */
  --color-primary: #246BD1;
  --color-primary-dark: #26266B;
  --color-primary-light: #5A94E3;
  --color-primary-foreground: #ffffff;
  --color-main-blue-1: #D6E5F8;

  /* Point */
  --color-success: #10b981;      /* 정상 */
  --color-warning: #f59e0b;      /* 경고/주의 */
  --color-destructive: #E74C3C;  /* 오류/긴급 */
  --color-info: #246BD1;

  /* Semantic */
  --color-background: #F8F9FC;
  --color-card: #ffffff;
  --color-foreground: #1e293b;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-accent: #D6E5F8;
  --color-border: #e2e8f0;
  --color-ring: #246BD1;

  /* Radius: sm .375 / md .5 / lg .75 / xl 1 / 2xl 1.25 rem */
}
```

### 4-2. 컨벤션
- `cn()` 헬퍼(`src/lib/utils.ts`)로 className 조합. 컴포넌트 라이브러리 없음(순수 Tailwind).
- 아이콘은 전부 lucide-react.
- 경로 alias `@/` → `src/`.

### 4-3. 상태 → 색상 매핑 (명문화)

| 기기 상태 | 의미 | 색상 토큰 |
|---|---|---|
| `normal` | 정상 가동 | `success` (green) |
| `warning` | 과열(Over Temperature) 경보 | `warning` (amber) |
| `error` | 오류 | `destructive` (red) |
| `offline` | 오프라인 | `muted-foreground` / `destructive` |

| 알림 우선순위 | 색상 |
|---|---|
| 긴급(URGENT) | `destructive` |
| 경고(WARNING) | `warning` |
| 정보(INFO) | `info`/`primary` |

### 4-4. 레이아웃 / 가드 (원본 구조 유지)
- 레이아웃: `AuthLayout`, `AdminLayout`(Sidebar + AdminHeader + AdminFooter), `UserLayout`(UserHeader + UserFooter)
- 라우트 가드: `ProtectedRoute`(인증), `AdminRoute`(admin), `UserRoute`(user), `GuestRoute`(미인증)

### 4-5. 공통 컴포넌트 패턴 (원본에서 재사용)
KPI 카드 · 상태 뱃지 · 카드 그리드 · 상세 모달 · 인라인 편집(hover 수정, Enter 저장/Esc 취소) · 검색·필터 바 · 프로그레스 바.

---

## 5. 도메인 / 용어

- **텔레코일존 = 기관** (동일 단위). admin 시점 "텔레코일존", user 시점 "우리 기관".
- 역할 매핑: 백엔드 `ADMIN`→`admin`, `ZONE_USER`→`user`.
- **기기 식별자 = MAC 주소.** friendly ID(`HL-0001`) 개념은 백엔드에 없으므로 **사용하지 않는다.** 기기 ID·검색 키·타이틀은 MAC(별칭 있으면 별칭) 기준.
- **별칭 표시**: 별칭 있으면 별칭=메인 타이틀 + MAC=서브태그 / 없으면 MAC=메인 타이틀.
- **상태 분류 파생 규칙** (FE `deviceMapper.deriveStatus`, REAL 기반):
  - `offline`: `connection_status === 'OFFLINE'`
  - `warning`: `last_gpio_state === true` (과열 Over Temperature 경보)
  - `normal`: 그 외(`CONNECTING`·`ONLINE`)
  - `error`: 에러 로그 기반 — `GET /devices/:mac/errors` 연동 시 추가(현재 미파생)
- **기기 텔레메트리 실제 의미 (하드웨어팀 확정 — 중요):**
  - `connection_status`(OFFLINE/CONNECTING/ONLINE) = **동작/가동·전원·연결 판단의 신뢰 키.** `is_connected`(staging 응답에서 제거됨)는 `connection_status !== OFFLINE`로 FE가 파생. **정상 가동/가동률은 `ONLINE`만 카운트.**
  - `last_gpio_state` = **과열(Over Temperature) 경보**(true=과열, false=정상). ⚠️ 동작 여부 아님.
  - `last_temperature` = **무의미**(온도 센서 없음, 고정/시드값). 고온 여부는 gpio. UI에서 온도(℃) 표기 제거.
  - `wifi_signal`(DISCONNECTED/WEAK/FAIR/STRONG) = Wi-Fi 신호 강도 실값. (`wifi_rssi_dbm` 원시값은 임시 디버깅 표시)
  - 볼륨 = 백엔드 신호 없음 → 표시 제거.

---

## 6. 환경 / 테스트 환경

**실제 staging 연동**이 기본. 백엔드는 로컬에 띄우지 않는다.

```
.env.development   VITE_API_BASE_URL=https://api.staging.smarthearingloop.com
                   VITE_ENABLE_MOCK=true        # 백엔드 미구현 API만 목 처리
.env.production    VITE_API_BASE_URL=https://api.smarthearingloop.com
                   VITE_ENABLE_MOCK=false
```

- `.env.example`을 만들어 키 목록 문서화.
- **MSW 전략**: 핸들러는 **백엔드에 아직 없는 API만** 등록(§10). 등록 안 된 경로는 그대로 통과 → 실제 staging 호출.
- **데모 계정**: `admin` / `admin1234` (백엔드 시드 관리자). 원본의 "아무 비밀번호 통과"는 폐기.
- ⚠️ **CORS**: staging API가 프론트 origin을 허용해야 호출 가능(`BACKEND_REQUIREMENTS.md §0`). 안 풀리면 로그인부터 막힌다.

---

## 7. 인증 & 라우팅

- 로그인: `POST /auth/login { username, password }` → `{ access_token }`.
- axios 인스턴스: 요청 인터셉터로 `Authorization: Bearer {token}` 주입, 응답 401 → 로그아웃 + `/login` 이동.
- 역할 분기: JWT payload(`{ sub, username, role }`) 디코드 → `ADMIN`이면 `/admin`, `ZONE_USER`이면 `/user`.
- zustand `authStore`: `{ token, user, isAuthenticated }` persist. `login()`이 **실제 API 호출**로 교체(원본의 MOCK_USERS 제거).

### 라우팅 표

```
/login                     로그인        (GuestRoute)

/admin                     대시보드
/admin/hearing-loops       히어링루프 관리
/admin/telecoil-zones      텔레코일존 관리
/admin/firmware            펌웨어 관리
/admin/alerts              알림센터       (목)

/user                      대시보드
/user/hearing-loops        히어링루프 관리
/user/settings             정보관리
/user/support              기술 지원
```

> **제외(원본에 있었으나 새 프론트에서 삭제)**: `/signup`, `/admin/activity-log`.

---

## 8. 백엔드 연동 상태 (REAL / MOCK / DERIVED)

| 화면·데이터 | 처리 | 엔드포인트 / 비고 |
|---|---|---|
| 로그인 | **REAL** | `POST /auth/login` |
| 유저 CRUD | **REAL** | `/users` (단, `username` 수정·`department`은 목/제한) |
| 텔레코일존 목록/수정/삭제 | **REAL** | `/zones` (이름만) |
| 텔레코일존+계정 통합 생성 | **MOCK** | 백엔드 통합 엔드포인트 대기 (§10) |
| 기관 주소/대표번호 | **MOCK** | Zone 확장 대기 |
| 기기 등록/목록/삭제/존배정 | **REAL** | `/devices`, `/devices/bulk`, `PUT /devices/:id/zone/:zoneId`(존배정), `DELETE /devices/:id` |
| 기기 상세(MAC·존·등록일·최종업데이트) | **REAL** | `GET /devices/:mac` |
| 기기 전원/동작/연결 | **REAL** | `connection_status`(OFFLINE/CONNECTING/ONLINE). 전원=연결여부, 동작=ONLINE. `is_connected`는 제거됨→FE 파생 |
| 기기 과열 경보 | **REAL** | `last_gpio_state`(true=과열). 온도값(`last_temperature`)은 무의미→미표시 |
| 기기 Wi-Fi 신호 | **REAL** | `wifi_signal`(DISCONNECTED/WEAK/FAIR/STRONG). `wifi_rssi_dbm`은 임시 디버깅 표시 |
| 기기 볼륨 | **제거** | 백엔드 신호 없음 → UI에서 제외 |
| 기기 펌웨어 버전 | **REAL** | `firmware_version` |
| 기기 상태(normal/warning/error/offline) | **DERIVED** | `connection_status`(offline) + `last_gpio_state`(warning=과열) |
| 별칭(alias) | **REAL** | `PATCH /devices/:mac { alias }`, unique 409 |
| 상태 이력 | **REAL** | `GET /devices/:mac/status?page=&limit=` |
| 기기 에러 로그 | **REAL** | `GET /devices/:mac/errors` |
| 펌웨어 업로드/목록/개별전송 | **REAL** | `/firmware`, `/firmware/:id/send/:mac`(설명 포함). ⚠️ 전송은 기기 ONLINE 아니면 400 |
| 펌웨어 업데이트 진행률/세션 이력 | **REAL** | SSE `/firmware/:mac/update-progress`, `/firmware/:mac/sessions`, `/firmware/sessions/:id` |
| KPI/가동률 집계(정상가동=ONLINE) | **DERIVED** | `GET /devices` 결과로 FE 집계(`connection_status==='ONLINE'`) |
| 알림센터(목록/통계/처리/임계값) | **REAL** | `/alerts`, `/alerts/:id`, `/alerts/settings/thresholds`(미연결 시간만). 알림 유형 3종(POWER_CUT 제거) |

---

## 9. 실연동 API 레퍼런스 (현재 백엔드에 존재)

베이스: `VITE_API_BASE_URL` · 인증: `Authorization: Bearer {JWT}` (login·health 제외)

```
GET    /health
POST   /auth/login                       { username, password } → { access_token }

POST   /users               (ADMIN)      { username, email, password, name, role?, zone_id? }
GET    /users               (ADMIN)
GET    /users/me            (인증)        → 내 프로필 + 소속 zone
GET    /users/:id           (ADMIN|본인)
PATCH  /users/:id           (ADMIN|본인) { username?, email?, password? }   // username/email 중복 시 409
DELETE /users/:id           (ADMIN)

POST   /zones               (ADMIN)      { name }              // CreateZoneDto = { name } 뿐
GET    /zones               (ADMIN)       → ZoneResponseDto[] (devices[] + user 포함)
GET    /zones/:id           (ADMIN|배정자)
PATCH  /zones/:id           (ADMIN)      { name? }
DELETE /zones/:id           (ADMIN)

POST   /devices             (ADMIN)      { mac_address, zone_id?, alias? }
POST   /devices/bulk        (ADMIN)      { devices: [{ mac_address, zone_id?, alias? }] } → { created, skipped }
GET    /devices             (인증)        ADMIN=전체 / ZONE_USER=소속
GET    /devices/:mac        (ADMIN|구역)
GET    /devices/:mac/status?page=&limit= → { data, total, page, limit }
PATCH  /devices/:mac        (ADMIN|구역)  { alias? }            // alias 중복 시 409
PUT    /devices/:id/zone/:zoneId (ADMIN)                      // ⚠️ zoneId는 경로 파라미터, body 없음. 실연동(목 아님)
DELETE /devices/:id         (ADMIN)

POST   /firmware            (ADMIN)      multipart { version, file }   // description 없음
GET    /firmware            (ADMIN)
POST   /firmware/:id/send/:mac (ADMIN)
```

응답 필드(백엔드 엔티티/DTO 확인):
- **기기**(`DeviceResponseDto`): `{ id, mac_address, zone_id, alias, status(PENDING|ACTIVE), registered_at, last_gpio_state(과열), last_temperature(무의미), last_seen_at, firmware_version, connection_status(OFFLINE|CONNECTING|ONLINE), wifi_signal, wifi_rssi_dbm(임시), zone, created_at }` — ⚠️ `is_connected`는 staging 응답에서 제거됨(connection_status로 대체)
- **구역**(`ZoneResponseDto`): `{ id, name, devices: DeviceInZoneDto[], user: { id, username, name, role } | null, created_at }`
- **사용자**(`UserResponseDto`): `{ id, username, email, name, role, zone_id, zone, created_at }`

> ⚠️ `zone.user`에는 **email이 없다**(`username/name/role`만). 담당자 이메일이 필요하면 `GET /users/:id`로 보강.

---

## 10. 목(MSW) 명세 — 백엔드에 없어 흉내내는 API

> 대부분 실연동으로 전환됨. 아래는 **현재까지 남은 목/FE우회**만 정리.

- ~~알림센터~~ → **REAL로 전환됨**. `GET /alerts`(통계 내장), `PATCH /alerts/:id`, 일괄 처리, `GET|PATCH /alerts/settings/thresholds`(미연결 시간만). 알림 유형 **3종**: `온도 이상(과열)|연결 끊김|펌웨어 업데이트 필요` (POWER_CUT·볼륨 이상 **제거**). 우선순위 `긴급|경고|정보`.
- ~~기기 별칭~~ → **REAL**(`PATCH /devices/:mac { alias }`, unique 409).
- ~~기기 확장 텔레메트리(power/network/volume/펌웨어버전)~~ → **REAL로 전환됨**: 전원·동작·연결=`connection_status`, Wi-Fi=`wifi_signal`, 과열=`last_gpio_state`, 펌웨어=`firmware_version`. **볼륨은 신호 없어 제거**, 온도값은 무의미해 미표시.
- ~~펌웨어 description / 진행률·이력~~ → **REAL**(description 포함, SSE 진행률 + 세션 이력/로그). 전체 전송(broadcast)은 여전히 없음.
- **텔레코일존 확장** — `address`, `phone`는 목(Zone 엔티티에 없음). 통합 생성 = FE 오케스트레이션(`POST /zones` → `POST /users`). `managerEmail`은 `zone.user`에 없어 `GET /users/:id` 보강.
- **기기 배정 해제** — 전용 엔드포인트 없음(`PUT /devices/:id/zone/:zoneId`는 배정·재배치만). 해제는 목/세션 오버라이드.
- **정보관리** — 기관 주소/대표번호, 담당자 부서(User에 `department` 없음).
- **`wifi_rssi_dbm`** — 백엔드 임시 추가(신호 단계 디버깅용). FE도 임시 표시 중 → 검증 후 제거.

---

## 11. 화면 명세

### 로그인
아이디/비밀번호, 비밀번호 표시·숨김 토글, 실패 시 에러 메시지, role 자동 분기.

### 관리자
- **대시보드** ⚠️ *새 요구사항에 상세 명세 없음.* 원본 디자인 재사용하되 **제외 기능(지도뷰·활동 타임라인·OTA 버튼)은 제거**. 텔레코일존별 요약 + 미배정 기기 배정 중심으로 축소. (확정 필요)
- **히어링루프 관리**: 전체 리스트(컬럼: 기기·텔레코일존·**전원·동작·WiFi(+RSSI 임시)·과열**·펌웨어·최근 업데이트) + 검색(MAC·별칭) + 텔레코일존/상태 필터 + 기기 등록(MAC). 상세 모달 — **조회 전용**(전원·**동작(정상작동/준비중/작동중지)**·WiFi 신호·**과열 경보** 보기, 온도·볼륨 표기 없음, 제어 없음), 펌웨어 버전·배치 존·MAC, 별칭 변경, 기기 삭제. 기기 이력 탭(알림/상태/**업데이트**/**에러**). *원본의 OTA/미배정 탭 구조는 제외.*
- **텔레코일존 관리**: 카드 그리드(가동률[정상가동=ONLINE]·기기수). 등록 모달(존명·담당자 이메일·사용자 계정 생성). 상세 모달 — 담당자 이메일 수정, 사용자 계정 ID 수정/PW **재설정**, 배정 기기 목록, 기기 추가 배정/**해제(확인 모달)**, 알림 이력, 존 삭제.
- **펌웨어 관리**: 펌웨어 추가(파일·버전·설명), 개별 전송(**ONLINE 기기만 선택 가능**), **SSE 실시간 진행률**. 전송 모달은 외부 클릭으로 안 닫힘.
- **알림센터** (REAL): KPI 카드, 처리상태 탭(대기/전달됨/종결/전체), 유형·우선순위 필터, **알림 발생 기준 안내 배너**(접이식), 상세 모달(전달/무시·종결), **일괄 전달·종결(확인 모달)**, 알림 설정(**미연결 임계값**만 — 온도 임계값은 과열 GPIO 기반 전환으로 제거).

### 사용자
- **대시보드**: 환영 배너(기관명·기기수·가동수·오늘 알림수), KPI(전체/정상/오프라인/경고), 가동률 프로그레스 바, 장비별 실시간 상태 목록, 오늘 알림 요약, 시스템 상태 메시지.
- **히어링루프 관리**: 상태 KPI, 검색(ID·별칭·MAC), 기기 카드 목록, 상세 모달(별칭 편집 Enter/Esc, 전원·WiFi 신호·**과열 경보** **조회**, 존·MAC·등록일·최종 업데이트). 동작/연결·과열은 admin과 동일 소스(connection_status·gpio).
- **정보관리**: 기관 정보(기관명 읽기 / 주소·대표번호 편집), 담당자 정보(이름·부서 읽기 / 이메일 편집), 인라인 편집(hover 수정, Enter/Esc), 저장 토스트.
- **기술 지원**: 사용 가이드 YouTube 임베드, 지원팀 연락처(이름·전화+영업시간·이메일). **정적 콘텐츠**(백엔드 불필요, FE config/상수).

### 제외 (원본에 있었으나 삭제 — 명시)
- 활동 로그(`/admin/activity-log`) + 실시간 로그 스트림
- 대시보드 지도뷰
- 회원가입(`/signup`)
- 히어링루프 OTA 탭 / 미배정 기기 탭 (펌웨어 관리는 별도 메뉴로 존재)
- 기기 제어(전원 토글·볼륨 조절) — 모든 텔레메트리는 **조회 전용**

---

## 12. 폴더 구조 / 컨벤션

원본 구조 유지 + 데이터 레이어 추가:

```
src/
├── api/            # axios 인스턴스 + 엔드포인트 함수
├── hooks/          # TanStack Query 훅 (useDevices, useZones, useAlerts ...)
├── mocks/          # MSW 핸들러 (백엔드 미구현 API만)
├── components/layout/   # 원본 그대로 (레이아웃·가드)
├── components/...       # 공통 컴포넌트 (원본 재사용/추출)
├── pages/admin|user|auth/  # 원본 페이지 (데이터 소스만 교체)
├── stores/         # zustand (authStore — 실 API로 교체)
├── types/          # 원본 뷰모델 유지 + API 응답 타입
├── lib/utils.ts    # cn()
└── index.css       # @theme 토큰 (원본 그대로)
```

- 서버 데이터는 **무조건 TanStack Query 훅**을 통해. 컴포넌트에서 axios 직접 호출 금지.
- `data/*.ts` 직접 import 제거 → 훅으로 대체(목 데이터는 `mocks/`로 이동).

---

## 13. TODO — 백엔드 실연동 전환 체크리스트

`BACKEND_REQUIREMENTS.md`의 항목이 staging에 배포되면 해당 MSW 핸들러를 제거한다.

- [ ] **CORS** 적용 확인 (이게 안 되면 실연동 전부 불가) — `§0`
- [ ] ✅ **[3B 확정] 텔레코일존+계정 통합 생성** (2026-06-04 사용자 최종 결정) — **계정은 선택(optional)**. 등록 UI 유지 + **FE 오케스트레이션**: `POST /zones {name}` 성공 후, 계정 정보가 입력됐으면 `POST /users {…, zone_id, role:ZONE_USER}`를 **한 번 더** 호출. 계정 비우면 존만 생성하고 **상세 모달에서 나중에 계정 생성** 가능. **'목' 표시**(통합 트랜잭션 엔드포인트 대기 — 배포되면 단일 호출로 교체, 이때 '목' 배지 제거). 1:1 관계는 백엔드 `Zone↔User` OneToOne으로 보장. — `§5-2`
- [ ] 🟡 **[3B] `GET /zones` 응답 보강 요청(목)** — user는 **email만** 필요(현재 `id/username/name/role`만 옴, email 없음) · device는 **`deviceCount`(포함 장비 수) + `activeDeviceCount`(정상 가동 수)** 추가 요청. FE 우회: deviceCount=`devices.length`, **activeCount=`connection_status==='ONLINE'` 파생**, managerEmail=`GET /users/:id` 보강. 카드 stat=전체장비/정상가동만.
- [ ] 🟡 **[3B] 존 상세 기기 텔레메트리** — 존 상세 칩은 `GET /devices`(존 필터)로 전원/동작/Wi-Fi/과열/펌웨어 실값 표시(connection_status·wifi_signal·gpio). 별도 보강 불필요.
- [ ] 🟡 **[3B] 기기 배정 해제 엔드포인트 요청** — 현재 없음(`PUT /devices/:id/zone/:zoneId`는 배정·재배치만). 해제는 **'목'으로 구현**(세션 오버라이드). 백엔드 추가 시 실연동.
- [ ] 기관 주소/대표번호(Zone 확장) → 목 제거 — `§5-1`
- [ ] 기기 별칭(nickname) → 목 제거 — `§4`
- [x] ✅ **StatusReport 확장(전원/동작/네트워크/Wi-Fi) → 실값 전환 완료** — `connection_status`(전원·동작·연결) + `wifi_signal`(신호 강도) 실연동. '목' 배지 제거. **볼륨은 신호 없어 표시 제거**(목도 폐기).
- [x] ✅ **기기별 펌웨어 버전 → 실값** (`firmware_version`).
- [ ] User department / username 수정 → 목 제거 — `§6`
- [x] ✅ **Firmware description → 실값.** (전체 전송 broadcast는 여전히 엔드포인트 없음 — 개별 전송만)
- [x] ✅ **알림센터 → 실연동 완료.** `/alerts`(통계 내장)·`PATCH /alerts/:id`·일괄 처리·`/alerts/settings/thresholds`. 유형 3종(POWER_CUT·볼륨 이상 제거), 온도 임계값 설정 제거(과열 GPIO 기반).
- [x] ✅ **연결 상태(online/offline) — 해결됨.** 백엔드가 `connection_status`(OFFLINE/CONNECTING/ONLINE, IoT Core lifecycle 기반) 신설·배포(d1d09c0). FE는 이걸로 전원/동작/offline 판정. ⚠️ staging 응답에서 `is_connected` 제거됨 → FE가 `connection_status !== OFFLINE`로 파생.
- [x] ✅ **정상가동·가동률 = ONLINE 기준 실연동.** `connection_status==='ONLINE'` 카운트로 가동률·정상가동 집계. (전체 장비 수=`devices.length` 실값)
- [x] ✅ **온도(`last_temperature`) = 무의미 확정.** 온도 센서 없음(하드웨어팀 확정). `last_gpio_state`는 **동작이 아니라 과열(Over Temperature) 경보**(1=과열). UI에서 온도(℃) 표기 제거, '과열 경보'로 대체.
- [x] ✅ **기기 존 배정 → 실연동 완료** `PUT /devices/:id/zone/:zoneId`(zoneId 경로 파라미터, body 없음, ADMIN). MSW 존배정 목·오버라이드·'목' 배지 제거함. 브라우저에서 `PUT /devices/1/zone/1 → 200` 확인. — `§9`
  - ⚠️ **존 배정 해제(미배정으로 되돌리기)는 엔드포인트 없음** — `:zoneId`가 필수 경로 파라미터(null 불가). 해제 기능이 필요하면 백엔드 추가 요청. (재배치=다른 존으로 PUT은 가능)
- [ ] 관리자 대시보드 상세 명세 확정 — `§11`
- [ ] 🟢 **기기 `disconnected_at` DTO 노출 요청 중** (2026-08-03, `BACKEND_REQUIREMENTS §11`) — 유저 페이지 오프라인 표시는 **3단계**(관리자는 실시간 유지): 미연결 4h 미만=전부 정상 연출 / 4~24h=WiFi만 회색 '끊김' / 24h 이상=빨간 '연결 끊김'+진짜 상태. 현재 `last_seen_at` 인터림으로 근사 중, 필드 내려오면 FE 매퍼 폴백(`disconnected_at ?? last_seen_at`)이 자동 교체.
- [x] ✅ online 판정 = `connection_status`(IoT lifecycle)로 해결 — 더 이상 last_seen 5분 휴리스틱 안 씀.

---

## 14. 구현 순서 (단계별)

> 한 번에 다 만들지 않는다. 각 단계는 **컴포넌트 디자인을 건드리지 않고**(원본 그대로) 데이터 소스만 교체/연결하는 것을 원칙으로 한다. 각 단계 끝에서 `npm run dev` 부팅 + `npm run build`(tsc) 통과를 검증한다.

### 0단계 — 셋업 ✅ (완료)
원본 clone + 라이브러리 설치(React Query / axios / zustand / MSW). 현재 코드는 아직 전부 mock 상태(`authStore`의 `MOCK_USERS`, `data/*.ts` 직접 import).

### 1단계 — 데이터 레이어 골격 (배관만)
컴포넌트는 일절 수정하지 않는다. 네트워크/상태 배관만 깐다.
- `src/api/client.ts` — axios 인스턴스 + 요청 인터셉터(`Authorization: Bearer {token}`) + 응답 401 인터셉터(logout → `/login`)
- `src/lib/queryClient.ts` + `main.tsx` — `QueryClientProvider` 장착
- `src/mocks/` — MSW 셋업(`handlers.ts`는 **빈 배열로 시작**, `browser.ts`, `public/mockServiceWorker.js`), `VITE_ENABLE_MOCK==='true'`일 때만 worker 부팅(`onUnhandledRequest: 'bypass'`)
- `authStore`에 인터셉터가 읽을 `token` 슬롯만 추가(persist 포함). **login 로직은 mock 유지** — 실 교체는 2단계.
- 위생: `.gitignore`(node_modules/dist/.env*), `.env.example`, `.env.development`(staging+mock=true), `.env.production`(prod+mock=false), `src/vite-env.d.ts` 환경변수 타입.

### 2단계 — 인증 실연동
- `authStore.login()` → `POST /auth/login { username, password }` 실 호출, `{ access_token }` 저장
- JWT payload(`{ sub, username, role }`) 디코드 → `ADMIN`→admin / `ZONE_USER`→user 분기. `GET /users/me`로 프로필/소속 zone 보강.
- `MOCK_USERS` 제거, `types/auth.ts`에 token/username/role(백엔드 enum) 반영
- `LoginPage` 데모힌트 "비밀번호 아무거나" → `admin/admin1234`로 수정(마크업·className은 유지)
- 라우트/페이지 정리: `/signup`, `/admin/activity-log` 제거(§7·§11), 관련 `data/*.ts`(`activityLogs.ts`) 제거

> **분할 원칙(2026-06-04 갱신):** 도메인별이 아니라 **역할별**로 간다. 사용자(ZONE_USER) 페이지는 관리자가 존+계정+기기 배정을 만들어야 로그인·데이터가 생기므로 **관리자 전체(3단계)를 끝낸 뒤 사용자(4단계)** 를 한다. 각 sub 착수 전 사용자에게 먼저 질문한다. 대시보드 2개는 명세 확정 전까지 ⛔ 보류.

### 3단계 — 관리자(admin) 전체
공통 배관은 각 sub에서 필요한 만큼 점진 추가(3A `api/devices`+`useDevices`, 3B `api/zones`·`api/users`, 3C `api/firmware`…).

- **3A. 히어링루프 관리** — `src/pages/admin/hearing-loops/index.tsx`. 상세 확정안은 §아래 "3A 확정" 및 `docs/REQUIREMENTS.md` 참조.
  - 데이터: `GET /devices`·`GET /devices/:mac`(REAL), 등록 `POST /devices`+`/bulk`, 삭제 `DELETE /devices/:id`, 별칭 `PATCH /devices/:mac`(409). 전원·동작·연결=`connection_status`, Wi-Fi=`wifi_signal`, 과열=`last_gpio_state`, 펌웨어=`firmware_version` 모두 **실값**(볼륨·온도 제거). 상태 뱃지는 `connection_status`+`last_gpio_state` **파생**(백엔드 `status`=PENDING/ACTIVE와 다름).
  - 제거: OTA 탭/버튼·미배정 탭·상세모달 제어요소(조회 전용화). 식별자=alias‖MAC(friendly id 폐기). 텔레코일존 필터 추가(`GET /zones`).
- **3B. 텔레코일존 관리** — 존 CRUD `GET/POST/PATCH/DELETE /zones`, 사용자 계정 생성/PW **재설정**(`/users`), 기기 배정 `PUT /devices/:id/zone/:zoneId`(**실연동**, 경로 파라미터). 알림 이력은 목. ⚠️ **배정 해제 엔드포인트 없음**(zoneId 필수)·**담당자 이메일은 `zone.user`에 없어 `GET /users/:id` 보강**. 목: 통합생성(존+계정 한 폼 — 단일 엔드포인트 없음 → FE 오케스트레이션[POST /zones→POST /users] 또는 목)·주소/대표번호. 카드 집계(deviceCount=`zone.devices.length`)는 **REAL**.
- **3C. 펌웨어 관리** — `POST/GET /firmware`(description 포함, REAL), 개별 전송 `POST /firmware/:id/send/:mac`(REAL, **ONLINE 기기만**), SSE 진행률·세션 이력(REAL). 미구현: 전체 전송(broadcast 엔드포인트 없음).
- **3D. 알림센터** — **전부 MSW 목**(§10 `/alerts*`, 백엔드 전무).
- **3E. 관리자 대시보드** ⛔ — 존별 요약·미배정 배정 중심. **보류: 구현 전 질문 후 진행**(§11 명세 확정).

> 3A·3B까지가 "의미 있는 최소"(기기+존+계정) — 여기까지면 사용자 계정으로 로그인해 실데이터 확인 가능.

### 4단계 — 사용자(user) 전체
> 3단계로 만든 실데이터 위에서 구현. **관리자 끝낸 뒤 시작.** 착수 직전 user 페이지 갭 점검 먼저.

- **4A. 히어링루프 관리** — `GET /devices`(ZONE_USER=소속 기기만 자동 필터). 상태 KPI·검색·카드·상세(조회+별칭 편집, 소속 구역 사용자도 `PATCH /devices/:mac` 가능). 목/파생은 3A와 동일.
- **4B. 정보관리** — 담당자 이메일 편집(`PATCH /users/:id`, `/users/me`). 기관 주소/대표번호·부서는 **목**.
- **4C. 기술 지원** — YouTube 임베드·연락처. **정적**(백엔드 불필요, FE 상수).
- **4D. 사용자 대시보드** ⛔ — **보류: 구현 전 질문 후 진행**. KPI/가동률은 `GET /devices` 집계.

### 📌 점검 보정 메모 (2026-06 기준, `BACKEND_REQUIREMENTS.md` 최신 반영)
아래는 본 문서 §8·§10·§13의 옛 표기를 덮어쓴다(문서 본문은 추후 일괄 정리):
- **별칭**: 필드명 `nickname`이 아니라 **`alias`**, **unique(409)**, `PATCH /devices/:mac`, **실연동(목 아님)**, 관리자+소속 구역 사용자 모두 가능.
- **`GET /users/me`**, **`username` 수정** 실연동(이미 구현). → §8의 "username 목/제한"은 무효.
- **CORS**: 백엔드가 `localhost:5173` 허용 예정 → Vite 포트 **5173 고정**.

### 📌 백엔드 코드 직접 분석 보정 (2026-06-04, `hearingloop-server` 엔티티·컨트롤러 확인)
실제 백엔드 소스/`docs/FRONTEND_CLAUDE.md`와 대조한 확정 사실. 충돌 시 이쪽 우선:
- 🔴 **존 배정 = `PUT /devices/:id/zone/:zoneId`** (zoneId 경로 파라미터, **body 없음**, ADMIN). **실연동(목 아님).** 이전 `PATCH /devices/:id/zone {zone_id}` 표기는 오류. → **3A의 MSW 존배정 목을 실 `PUT` 호출로 교체 필요**(§13).
  - **배정 해제 엔드포인트 없음**(`:zoneId` 필수, null 불가). 미배정으로 되돌리기는 백엔드 추가 필요.
- **남은 목/미구현(2026-06-15 기준)**: Zone에 `address`/`phone`/`manager_email` 없음 · User에 `department` 없음 · Firmware broadcast(전체 전송) 엔드포인트 없음 · 기기 배정 **해제** 엔드포인트 없음 · 존+계정 **통합 생성 단일 엔드포인트 없음**(FE 오케스트레이션).
  - ✅ 실값 전환됨: Device `connection_status`/`wifi_signal`(+`wifi_rssi_dbm` 임시)/`last_gpio_state`(과열)/`firmware_version` · **Alert 모듈**(알림센터 실연동) · Firmware `description`·진행률·세션 이력.
- **확정 실값**: `last_gpio_state`(**과열 경보**, 동작 아님)·`connection_status`(전원·동작·연결)·`wifi_signal`·`firmware_version`·`alias`(unique)·`last_seen_at` · `GET /zones`가 `devices[]+user` 반환(deviceCount·배정기기·담당계정 REAL). ⚠️ `last_temperature`는 무의미(센서 없음), `is_connected`는 응답에서 제거됨.
- **`device_error_log` 엔티티는 존재**하나 **조회 엔드포인트가 없어** FE가 'error' 상태를 파생할 수 없음(여전히 normal/warning/offline만 파생 가능).
- **`zone.user`에 email 없음** → 담당자 이메일은 `GET /users/:id` 보강.
- 백엔드가 `docs/FRONTEND_CLAUDE.md`를 최신 유지 중 — 의심스러우면 그 문서/Swagger를 확인.
