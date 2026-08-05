# 백엔드 추가 요구사항 (프론트엔드 연동용)

> 새 프론트엔드(히어링루프 모니터링)를 구현하면서 발견한, **현재 백엔드에 없거나 변경이 필요한 항목**을 정리한 전달용 문서다.
> 프론트 코드는 항상 "진짜 API를 호출한다"고 가정하고 작성되므로, 아래 명세대로 구현되면 프론트 수정은 거의 없다.
>
> **최종 검증: 2026-08-03** — `hearingloop-server` **origin/develop** 브랜치의 엔티티·컨트롤러·DTO를 직접 대조해 상태를 갱신했다.
> (main은 구버전이므로 develop 기준으로 판단한다.)

## 상태 범례

| 표기 | 의미 |
|---|---|
| ✅ | **구현 완료** — develop에 반영됨 (실연동 중) |
| 🔴 | **블로커** — 없으면 실연동 자체가 불가 |
| 🟡 | **기능 갭** — 프론트가 목/우회로 처리 중 |
| 🟢 | **개선** — 있으면 프론트가 단순해짐 (없어도 FE 우회 가능) |

---

## ✅ 구현 완료 — 더 이상 요청 항목이 아님

아래는 요청 이후 백엔드에 반영되어 **전부 실연동 중**이다. 참고용으로만 남긴다.

| 항목 | 현재 상태 |
|---|---|
| **CORS** | `main.ts` `enableCors` — `localhost:5173` 허용, `credentials: true` |
| **기기 별칭** | `alias`(nullable, **unique** → 중복 시 409). 등록 시 지정 + `PATCH /devices/:mac`. 관리자 + 소속 구역 사용자 |
| **사용자 아이디/이메일/비밀번호 수정** | `PATCH /users/:id` (중복 검사 포함) |
| **내 정보 조회** | `GET /users/me` — 프로필 + 소속 zone |
| **기기 연결 상태 산출** (구 §3) | `connection_status`(OFFLINE/ONLINE/UPDATING) — IoT Core lifecycle 기반. `last_seen_at` 휴리스틱 폐기 |
| **StatusReport 확장** (구 §1) | `connection_status`(전원·동작·연결) + `wifi_signal`(신호 등급) + `wifi_rssi_dbm`(원시값)로 해결. `gpio_state`는 **과열 경보**로 확정(온도 센서 없음). **볼륨은 신호 자체가 없어 표시 제거** — `power`/`operating`/`network`/`volume` 별도 컬럼 요청은 **폐기** |
| **기기별 펌웨어 버전** (구 §2) | `firmware`(설치 세트 객체) + `wifi_firmware_version`(ESP32) + `hl_firmware_version`(Nordic) + `firmware_inconsistent`(편측 성공 플래그) |
| **알림센터 전체** (구 §8) | `alerts` 모듈 구현 완료. `GET /alerts`(통계 내장) · `GET /alerts/my`(ZONE_USER) · `PATCH /alerts/:id` · `GET·PATCH /alerts/settings/thresholds`. 유형 3종(온도 이상·연결 끊김·펌웨어 업데이트 필요), 우선순위 3단계 |
| **기기 존 배정 해제** (구 §9) | `DELETE /devices/:id/zone` 구현됨 (ADMIN). 배정/재배치는 `PUT /devices/:id/zone/:zoneId` |
| **펌웨어 설명** (구 §7 일부) | zip 내 `update.json`의 `updates[]`(변경 내역)로 대체 해결. 별도 `description` 컬럼 요청 폐기 |
| **존 정상가동 집계** (구 §5-3 일부) | `ZoneResponseDto.active_device_count` 추가됨 |

---

## 남은 요청 항목

### 5-1. 텔레코일존(Zone) 기관 정보 필드 🟡

**현재**: `Zone` 엔티티는 `id / name / devices / user / created_at`뿐. 주소·대표번호 컬럼이 없다.

작업:
- `Zone`에 `address`(주소), `phone`(대표번호) 컬럼 추가
- `PATCH /zones/:id`에서 수정 허용

**프론트 우회(현재)**: 사용자 정보관리 화면의 주소·대표번호를 **브라우저 localStorage에 저장**(존별 키 분리). 기기가 바뀌면 소실되고 다른 사용자와 공유되지 않는다 — 실사용 전 반드시 필요.

---

### 5-2. 존 + 사용자 계정 통합 생성 🟡

**현재**: `CreateZoneDto`는 `{ name }` 뿐이고, zone 생성과 user 생성이 분리돼 있다.

```
POST /zones
{
  "name": "성동구청",
  "username": "seongdong",     // optional — 없으면 존만 생성
  "password": "...",
  "email": "manager@example.com",
  "manager_name": "홍길동"
}
→ Zone + User(role=ZONE_USER, zone_id 연결) 트랜잭션 동시 생성
→ 반환: { zone, user }
```

**프론트 우회(현재)**: FE 오케스트레이션 — `POST /zones` 성공 후 계정 정보가 있으면 `POST /users`를 한 번 더 호출. **트랜잭션이 아니라서 계정 생성만 실패하면 존은 남는다**(부분 성공 안내로 처리 중). 통합 엔드포인트가 생기면 단일 호출로 교체.

---

### 5-3. `GET /zones`에 전체 기기 수 추가 🟢

**현재**: `ZoneResponseDto`에 `active_device_count`는 있으나 **전체 기기 수(`device_count`)가 없다.** (`devices[]` 배열도 응답에서 빠짐)

작업:
- `ZoneResponseDto`에 `device_count` 추가

**프론트 우회(현재)**: 존 목록을 그릴 때마다 `GET /devices` 전체를 함께 불러 `zone_id`별로 집계한다. 존 화면이 기기 API에 불필요하게 의존하는 구조.

> ⚠️ 참고: FE는 `active_device_count`도 사용하지 않고 `connection_status === 'ONLINE'` 카운트로 직접 집계한다 — staging에서 이 값이 0 고정으로 관측된 이력이 있어서다. 값이 정상화되면 FE 파생을 제거할 수 있다.

---

### 6. 사용자(User) `department` 컬럼 🟡

**현재**: `User` 엔티티는 `username / email / password / name / role / zone_id / created_at`뿐. 부서 컬럼이 없다.

작업:
- `User`에 `department`(부서) 컬럼 추가 (정보관리 화면에서 읽기 전용 표시)

> ⚠️ 비밀번호 평문 조회는 불가(bcrypt). 관리자는 **재설정만** 가능 — 프론트도 "PW 재설정"으로 구현돼 있다.

---

### 7. 펌웨어 전체 전송(broadcast) 🟢

**현재**: 개별 전송 `POST /firmware/:id/send/:mac`만 있다.

작업:
- `POST /firmware/:id/broadcast` (또는 `send-all`) — 전체/존별 기기에 일괄 발송

**프론트 우회(현재)**: 선택한 MAC 목록을 순회하며 개별 전송을 병렬 호출한다(관리자 OTA 모달·펌웨어 관리 화면). 동작에 문제는 없으나 대수가 늘면 요청 수가 그대로 늘어난다.

---

### 11. 기기 `disconnected_at` DTO 노출 🟢 (2026-08-03 추가)

**현재**: `DeviceWhitelist.disconnected_at`은 **엔티티에 존재하고 정확히 유지된다** — 브로커 disconnect 시 기록, 재연결 시 `null`로 초기화하며, 4시간 CONNECTION_LOST 스케줄러가 이미 이 값을 쓴다. 그러나 `DeviceResponseDto`에는 노출되지 않는다(`last_seen_at`만 내려옴).

**필요 이유**: 사용자(기관) 페이지에서 '연결 끊김'을 즉시가 아니라 **24시간 이상 지속 시에만** 표시하기로 결정(2026-08-03, 시험성적서 기재 사항). 정확한 미연결 지속 시간 계산에 이 필드가 필요하다.

작업:
- `GET /devices`, `GET /devices/:mac` 응답 DTO에 `disconnected_at: Date | null` 추가 — **값은 이미 있으므로 노출만 하면 된다**

**프론트 인터림(현재)**: `disconnected_at ?? last_seen_at`으로 폴백 계산 중. `last_seen_at`은 마지막 StatusReport 수신 시각이라 실제 끊김 시점보다 과거일 수 있어 **임계값이 이르게 발동**할 수 있다. 필드가 내려오는 순간 FE 수정 없이 자동 교체된다.

---

## (참고) 프론트에서 제외된 기능 — 백엔드 작업 불필요

- 활동 로그 / 실시간 로그 스트림 (activity-log)
- 대시보드 지도뷰 (기기 좌표)
- 회원가입(공개 가입) — 계정은 관리자가 생성
- 기기 제어(전원 토글·볼륨 조절) — 요구사항은 **조회 전용**
  - ⚠️ 백엔드에 `POST /devices/:mac/command`(관리자 명령 전송)가 존재하나 **프론트는 사용하지 않는다.**

---

## 우선순위 요약 (2026-08-03 갱신)

| 순위 | 항목 | 등급 | 프론트 현재 상태 |
|---|---|---|---|
| 1 | Zone `address`·`phone` (§5-1) | 🟡 | localStorage 저장 — 기기 바뀌면 소실 |
| 2 | 존+계정 통합 생성 (§5-2) | 🟡 | FE 2회 호출, 부분 성공 위험 |
| 3 | User `department` (§6) | 🟡 | 표시 생략 |
| 4 | 기기 `disconnected_at` 노출 (§11) | 🟢 | `last_seen_at` 근사 — 시험성적서 기재 사항 |
| 5 | `GET /zones`에 `device_count` (§5-3) | 🟢 | `/devices` 전체 조회로 집계 |
| 6 | 펌웨어 broadcast (§7) | 🟢 | 개별 전송 병렬 호출 |

> 🔴 블로커 없음. 남은 항목은 모두 프론트 우회가 동작 중이며, §5-1만 실사용 전 해소가 필요하다.
