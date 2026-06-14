# 백엔드 추가 요구사항 (프론트엔드 연동용)

> 새 프론트엔드(히어링루프 모니터링)를 구현하면서 발견한, **현재 백엔드에 없거나 변경이 필요한 항목**을 정리한 전달용 문서다.
> 프론트는 이 기능들을 우선 **MSW 목(mock)** 으로 구현하고, 백엔드가 staging에 배포되면 **목 핸들러만 제거**해 실연동으로 전환한다.
>
> 프론트 코드는 항상 "진짜 API를 호출한다"고 가정하고 작성되므로, 아래 명세대로 구현되면 프론트 수정은 거의 없다.

## 상태 범례

| 표기 | 의미 |
|---|---|
| ✅ | **구현 완료** — 최신 커밋에 반영됨 (실연동 가능) |
| 🔴 | **블로커** — 없으면 실연동 자체가 불가 |
| 🟡 | **기능 갭** — 현재 프론트가 목으로 우회 중 |
| 🟢 | **개선** — 있으면 프론트가 단순해짐 (없어도 FE에서 우회 가능) |

---

## ✅ 이미 구현됨 (최신 커밋 반영 — 실연동)

아래는 처음 작성 이후 백엔드에 반영되어 **더 이상 목이 아니다.** 프론트는 실제 API로 연동한다.

| 항목 | 내용 |
|---|---|
| **CORS** | `main.ts`에 `enableCors` 추가. 로컬 개발 origin `http://localhost:5173` 허용 예정(백엔드 조정 중), `credentials: true` |
| **기기 별칭** | 필드명 **`alias`** (`nickname` 아님). ⚠️ **unique 제약**(중복 불가 → 409). 등록 시 지정 가능 + `PATCH /devices/:mac { alias }`. **관리자 + 소속 구역 사용자 모두** 가능 |
| **사용자 아이디 수정** | `PATCH /users/:id`가 `username` 수정 허용(중복 검사 포함) + `email`/`password` |
| **내 정보 조회** | `GET /users/me` — 로그인 사용자 프로필 + 소속 zone 반환 |
| **기기 수정 엔드포인트** | `PATCH /devices/:mac` 추가 (현재 alias만, 추후 확장 지점) |
| **응답 DTO 타입화** | devices/users/zones/firmware 응답이 Swagger DTO로 명세됨. `GET /zones`는 `devices[] + user`까지 반환 |

> CORS origin 포트는 백엔드가 **5173**으로 맞춘다(프론트 Vite 기본 포트). staging/prod 프론트 도메인은 배포 시 추가 필요.

---

## 1. 기기 StatusReport 확장 🟡

**현재**: 기기 → 서버 StatusReport에 `gpio_state(boolean)`, `temperature`, `timestamp`만 있음.
**필요**: 프론트 모니터링 화면이 표시하는 4가지 — `power`(전원), `operating`(기기 동작), `network_connected`(네트워크), `volume`(볼륨).

작업:
- 기기 펌웨어 StatusReport(Protobuf/JSON)에 `power`, `operating`, `network_connected`, `volume` 추가
- `DeviceStatusLog` 컬럼 추가: `power`, `operating`, `network_connected`, `volume`
- `DeviceWhitelist` 최신값 컬럼 추가: `last_power`, `last_operating`, `last_network_connected`, `last_volume`
- `GET /devices`, `GET /devices/:mac`, `GET /devices/:mac/status` 응답에 포함

**✅ 반영됨(2026-06-15)**: `connection_status`(OFFLINE/CONNECTING/ONLINE)로 전원·동작·연결 실값 제공, `wifi_signal`로 Wi-Fi 신호 강도 제공. `gpio_state`는 **동작이 아니라 과열(Over Temperature) 경보**로 확정(온도 센서 없음). **볼륨은 신호 없어 표시 제거.** (`operating`/`power`/`network`/`volume` 별도 컬럼 요청은 폐기 — connection_status로 대체)

---

## 2. 기기별 펌웨어 버전 저장 ✅ (반영 완료 — `firmware_version` 응답 제공)

기기 상세 화면의 "펌웨어 버전"을 표시해야 하는데, 현재 기기 엔티티에 펌웨어 버전이 저장되지 않는다(HelloRequest로 수신만 함).

작업:
- `DeviceWhitelist`에 `self_fw_version` 컬럼 추가
- `handleHelloRequest`에서 수신한 `self_fw_version`을 기기에 저장
- `GET /devices*` 응답에 노출

---

## 3. 기기 연결 상태(online/offline) 산출 ✅ (반영 완료 — `connection_status` IoT Core lifecycle 기반)

프론트 상태 분류(`normal/warning/error/offline`)에 online 판정이 필요하다.

- 권장: 백엔드가 `last_seen_at` 기준으로 `connection_status`(online/offline)를 계산해 응답에 내려주면 FE/BE 일관성 확보
- 미구현 시 FE가 `last_seen_at` 임계값으로 파생 (**기본값 제안: 5분 — 실제 StatusReport 주기에 맞춰 확정 필요**)

---

## 4. 기기 별칭 ✅ (구현 완료)

`DeviceWhitelist.alias`(nullable, **unique**)로 구현됨. `PATCH /devices/:mac { alias }`로 수정(관리자 + 소속 구역 사용자), 등록 시에도 지정 가능. `GET /devices*` 응답에 `alias` 포함.

- ⚠️ **unique 제약** — 별칭 중복 시 409. 프론트에서 중복 에러 처리 필요.
- **표시 규칙**(프론트): 별칭 있으면 별칭이 메인 타이틀 + MAC이 서브태그, 없으면 MAC이 메인 타이틀.

---

## 5. 텔레코일존(Zone) 확장 🟡

### 5-1. 기관 정보 필드
- `Zone`에 `address`(주소), `phone`(대표번호) 컬럼 추가 + `PATCH /zones/:id`에서 수정 허용 (정보관리 화면용)

### 5-2. 존 + 사용자 계정 통합 생성 엔드포인트
프론트의 텔레코일존 등록 폼은 **[존 이름 + 담당자 이메일 + 사용자 계정]을 한 번에** 받는다. 현재는 zone 생성과 user 생성이 분리돼 있음.

```
POST /zones
{
  "name": "서울시청",
  "manager_email": "manager@example.com",
  "username": "seoul-user",
  "password": "...",
  "manager_name": "홍길동",
  "address": "...",   // optional
  "phone": "..."      // optional
}
→ Zone + User(role=ZONE_USER, zone_id 연결) 트랜잭션 동시 생성
→ 반환: { zone, user }
```

### 5-3. (개선) 카드 그리드용 집계 🟢
`GET /zones` 응답에 `deviceCount`, `activeDeviceCount`, 연결된 user 요약을 포함하면 카드 그리드가 단순해짐. 없으면 FE가 `/devices`로 집계.

---

## 6. 사용자(User) 확장 🟡

- `User`에 `department`(부서) 컬럼 추가 (정보관리 담당자 정보, 읽기 전용 표시)
- ✅ `username`(아이디) 수정은 이미 구현됨(`PATCH /users/:id`) — 상단 "이미 구현됨" 참고
- ⚠️ **비밀번호 평문 조회는 불가**(bcrypt 해시). 관리자는 **재설정(reset)만** 가능 → 프론트 UI도 "PW 조회"가 아니라 "PW 재설정"으로 구현

---

## 7. 펌웨어(Firmware) 확장 🟡

- `Firmware`에 `description`(간단 설명) 컬럼 추가 + `UploadFirmwareDto`에 필드 추가
- **전체 펌웨어 업데이트** 엔드포인트 추가: `POST /firmware/:id/broadcast` (또는 `send-all`) → 대상 전체/존별 기기에 업데이트 알림 발송 (`IotService.broadcast()` 메서드는 이미 존재, 컨트롤러만 추가)
- `self`/`target` 구분: 프론트는 기본 `self`만 노출 예정. `target` 노출이 필요하면 협의.

---

## 8. 알림센터(Alert) — 전체 신규 🟡 (가장 큰 작업)

현재 백엔드에 **알림 기능이 전무**하다(SPEC.md 로드맵에만 존재). 프론트는 전부 MSW 목으로 구현한다. 백엔드 설계 제안:

### 8-1. 엔티티
```
Alert
├── id
├── mac_address
├── zone_id
├── type        (TEMP_HIGH | POWER_OFF | VOLUME_ABNORMAL | DISCONNECTED | FW_UPDATE_NEEDED)
├── priority    (URGENT | WARNING | INFO)
├── status      (PENDING | FORWARDED | CLOSED)   // 처리대기 / 사용자전달 / 관리자종결
├── message
├── occurred_at
├── processed_at
├── processed_by
└── created_at

AlertSetting
├── temp_threshold
├── volume_threshold_min / volume_threshold_max
├── grouping            (알림 그룹핑 on/off)
└── auto_escalation_minutes
```

### 8-2. 생성 로직
`handleStatusReport` / `handleErrorReport` 수신 시 `AlertSetting` 임계값과 비교해 Alert 자동 생성.

### 8-3. 엔드포인트
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/alerts?status=&type=&priority=&zone_id=&page=&limit=` | 목록 (ADMIN 전체 / ZONE_USER 소속) |
| GET | `/alerts/stats` | KPI: 전체, 처리대기, 긴급, 오늘 발생 |
| PATCH | `/alerts/:id/forward` | 사용자에게 전달 |
| PATCH | `/alerts/:id/close` | 관리자 종결 (또는 dismiss/무시) |
| POST | `/alerts/bulk-forward` | body `{ ids: [] }` 일괄 전달 |
| POST | `/alerts/bulk-close` | body `{ ids: [] }` 일괄 종결 |
| GET | `/alerts/settings` | 알림 설정 조회 |
| PATCH | `/alerts/settings` | 알림 설정 수정 (임계값/그룹핑/에스컬레이션) |

> 텔레코일존 상세의 "알림 이력"은 `GET /alerts?zone_id=` 또는 `GET /zones/:id/alerts`로 처리.

---

## 9. 기기 존 배정 해제 🟢

`PATCH /devices/:id/zone`이 `zone_id=null`을 허용하도록(현재 `ParseIntPipe`로 null 불가). 기기를 미배정 상태로 되돌릴 때 필요.

---

## 10. (참고) 프론트에서 제외된 기능 — 백엔드 작업 불필요

다음은 원본 프론트(reference)에는 있었으나 새 프론트에서 **제외**되었으므로 백엔드 작업이 필요 없다:

- 활동 로그 / 실시간 로그 스트림 (activity-log)
- 대시보드 지도뷰 (기기 좌표)
- 회원가입(공개 가입) — 계정은 관리자가 생성
- 기기 제어 (전원 토글·볼륨 조절) — 새 요구사항은 **조회 전용**

---

## 우선순위 요약

> ✅ 완료: CORS, 기기 별칭(alias), 사용자 아이디 수정, `/users/me` — 상단 "이미 구현됨" 참고.

| 순위 | 항목 | 등급 |
|---|---|---|
| 1 | 텔레코일존+계정 통합 생성 / Zone 확장 필드 | 🟡 |
| 2 | StatusReport 확장 (power/operating/network/volume) | 🟡 |
| 3 | 기기별 펌웨어 버전 저장 | 🟡 |
| 4 | User department 컬럼 | 🟡 |
| 5 | Firmware description / 전체 업데이트 | 🟡 |
| 6 | 알림센터 전체 | 🟡 (대규모) |
| 7 | 연결 상태 산출 / 존 배정 해제 | 🟢 |
