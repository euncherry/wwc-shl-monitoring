import {
  Radio,
  Power,
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

import bannerImg from "@/assets/banner-illustration.png";

/* ══════════════════════════════════════════════════════
   Mock data — 사용자 기관 데이터
   ══════════════════════════════════════════════════════ */

const myZone = {
  zoneName: "서울시청",
  totalDevices: 4,
  activeDevices: 4,
  offlineDevices: 0,
  warningDevices: 0,
};

const todayAlerts: {
  id: string;
  type: string;
  level: "critical" | "warning" | "info";
  message: string;
  time: string;
  device: string;
}[] = [
  {
    id: "a1",
    type: "온도 주의",
    level: "warning",
    message: "HL-0042 온도 43°C 감지 (임계값 근접)",
    time: "14:22",
    device: "HL-0042",
  },
  {
    id: "a2",
    type: "펌웨어 알림",
    level: "info",
    message: "HL-0041 펌웨어 업데이트 가능 (v2.5.0)",
    time: "09:15",
    device: "HL-0041",
  },
];

const deviceList = [
  {
    id: "HL-0041",
    nickname: "1층 민원 안내데스크",
    status: "normal" as const,
    power: true,
    network: true,
    temp: 36,
    firmware: "v2.4.1",
  },
  {
    id: "HL-0042",
    nickname: "2층 민원 상담실",
    status: "normal" as const,
    power: true,
    network: true,
    temp: 43,
    firmware: "v2.5.0",
  },
  {
    id: "HL-0043",
    nickname: "3층 대회의실",
    status: "normal" as const,
    power: true,
    network: true,
    temp: 35,
    firmware: "v2.5.0",
  },
  {
    id: "HL-0044",
    nickname: "",
    status: "normal" as const,
    power: true,
    network: true,
    temp: 34,
    firmware: "v2.5.0",
  },
];

const lastAlertTime = "2025-01-20 14:22";

/* ══════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════ */

export default function UserDashboard() {
  const operatingRate =
    myZone.totalDevices > 0
      ? Math.round((myZone.activeDevices / myZone.totalDevices) * 100)
      : 0;
  const allNormal = myZone.offlineDevices === 0 && myZone.warningDevices === 0;
  const hasCriticalToday = todayAlerts.some((a) => a.level === "critical");

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner ─── */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "color-mix(in srgb, #246BD1 20%, transparent)",
          minHeight: "11.75rem",
          padding: "1.875rem 2.5rem",
        }}
      >
        <div className="relative z-10 max-w-xl">
          <h2 className="text-[clamp(1.375rem,1.1rem+0.8vw,1.625rem)] font-bold text-[#1E293B] mb-2">
            안녕하세요, {myZone.zoneName} 담당자님!
          </h2>
          <p className="text-[clamp(0.8125rem,0.75rem+0.25vw,0.875rem)] text-[#475569] leading-[1.7] max-w-[26rem]">
            {myZone.zoneName}에 설치된 {myZone.totalDevices}개의 히어링루프 중{" "}
            {myZone.activeDevices}개가 정상 작동 중입니다.
            {todayAlerts.length > 0 && (
              <>
                <br />
                오늘 {todayAlerts.length}건의 알림이 발생했습니다.
              </>
            )}
          </p>
        </div>
        <div
          className="absolute right-6 bottom-0 flex items-end"
          style={{ width: "clamp(14rem, 25vw, 18rem)" }}
        >
          <img
            src={bannerImg}
            alt="히어링 루프 모니터링 일러스트"
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─── 기관 히어링루프 현황 (메인) ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            우리 기관 히어링루프 현황
          </h3>
          <span className="ml-auto text-[12px] text-muted-foreground">
            {myZone.zoneName}
          </span>
        </div>

        <div className="p-6">
          {/* KPI 상단 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Radio className="h-4 w-4 text-primary" />
                <span className="text-[12px] text-muted-foreground">
                  전체 장비
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {myZone.totalDevices}
              </p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/3 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Power className="h-4 w-4 text-success" />
                <span className="text-[12px] text-muted-foreground">
                  정상 가동
                </span>
              </div>
              <p className="text-3xl font-bold text-success">
                {myZone.activeDevices}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">
                  오프라인
                </span>
              </div>
              <p
                className={`text-3xl font-bold ${myZone.offlineDevices > 0 ? "text-destructive" : "text-muted-foreground/40"}`}
              >
                {myZone.offlineDevices}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-[12px] text-muted-foreground">경고</span>
              </div>
              <p
                className={`text-3xl font-bold ${myZone.warningDevices > 0 ? "text-warning" : "text-muted-foreground/40"}`}
              >
                {myZone.warningDevices}
              </p>
            </div>
          </div>

          {/* 가동률 바 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-foreground">
                가동률
              </span>
              <span
                className={`text-[15px] font-bold tabular-nums ${operatingRate === 100 ? "text-success" : operatingRate >= 80 ? "text-primary" : "text-destructive"}`}
              >
                {operatingRate}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-border/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${operatingRate === 100 ? "bg-success" : operatingRate >= 80 ? "bg-primary" : "bg-destructive"}`}
                style={{ width: `${operatingRate}%` }}
              />
            </div>
          </div>

          {/* 장비 리스트 */}
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-foreground mb-3">
              장비별 상태
            </h4>
            {deviceList.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-4 rounded-xl border border-border/50 px-4 py-3 hover:bg-page/30 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Radio className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold text-foreground">
                      {d.nickname || d.id}
                    </p>
                    <span className="rounded bg-page px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {d.id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[12px]">
                  <div className="flex items-center gap-1.5">
                    {d.power ? (
                      <Power className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Power className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">전원</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.network ? (
                      <Wifi className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className="text-muted-foreground">네트워크</span>
                  </div>
                  {/* <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${d.temp > 45 ? 'text-destructive' : d.temp > 40 ? 'text-warning' : 'text-foreground'}`}>
                      {d.temp}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`font-mono font-semibold ${d.firmware === 'v2.5.0' ? 'text-success' : 'text-warning'}`}>
                      {d.firmware}
                    </span>
                  </div> */}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${
                    d.status === "normal"
                      ? "bg-success/10 text-success"
                      : d.status === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      d.status === "normal"
                        ? "bg-success"
                        : d.status === "warning"
                          ? "bg-warning"
                          : "bg-destructive"
                    }`}
                  />
                  {d.status === "normal"
                    ? "정상"
                    : d.status === "warning"
                      ? "경고"
                      : "오류"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 하단 3열 그리드: 시스템 상태 / 오늘 알림 / 최근 알림 시간 ─── */}
      <div className="grid grid-cols-3 gap-4">
        {/* 오늘 발생 알림 */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${hasCriticalToday ? "bg-destructive/10" : "bg-primary/10"}`}
            >
              <Bell
                className={`h-5 w-5 ${hasCriticalToday ? "text-destructive" : "text-primary"}`}
              />
            </div>
            <h3 className="text-[14px] font-bold text-foreground">
              오늘 발생 알림
            </h3>
            <span
              className={`ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[12px] font-bold ${
                todayAlerts.length > 0
                  ? "bg-warning/10 text-warning"
                  : "bg-page text-muted-foreground"
              }`}
            >
              {todayAlerts.length}
            </span>
          </div>
          {todayAlerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Bell className="h-7 w-7 text-muted-foreground/20" />
              <p className="text-[13px] text-muted-foreground">
                오늘 발생한 알림이 없습니다
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-[12px] ${
                    alert.level === "critical"
                      ? "bg-destructive/5 border border-destructive/15"
                      : alert.level === "warning"
                        ? "bg-warning/5 border border-warning/15"
                        : "bg-primary/5 border border-primary/15"
                  }`}
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      alert.level === "critical"
                        ? "bg-destructive"
                        : alert.level === "warning"
                          ? "bg-warning"
                          : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {alert.type}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate">
                      {alert.message}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {alert.time}
                  </span>
                </div>
              ))}
            </div>
          )}
          {hasCriticalToday && (
            <div className="flex items-center gap-1.5 mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-[11px] font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              긴급 알림이 포함되어 있습니다
            </div>
          )}
        </div>

        {/* 시스템 상태 메시지 */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${allNormal ? "bg-success/10" : "bg-warning/10"}`}
            >
              {allNormal ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            <h3 className="text-[14px] font-bold text-foreground">
              시스템 상태
            </h3>
          </div>
          <div
            className={`rounded-xl p-4 ${allNormal ? "bg-success/5 border border-success/20" : "bg-warning/5 border border-warning/20"}`}
          >
            <p
              className={`text-[14px] font-semibold ${allNormal ? "text-success" : "text-warning"}`}
            >
              {allNormal
                ? "모든 히어링루프가 정상 동작 중입니다"
                : "일부 장비에 주의가 필요합니다"}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {allNormal
                ? `${myZone.totalDevices}대 모두 정상 가동 · 가동률 ${operatingRate}%`
                : `${myZone.offlineDevices}대 오프라인 · ${myZone.warningDevices}대 경고`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${allNormal ? "bg-success" : "bg-warning"} animate-pulse`}
            />
            실시간 모니터링 중
          </div>
        </div>

        {/* 최근 알림 시간 */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-[14px] font-bold text-foreground">
              최근 알림 시간
            </h3>
          </div>
          <div className="rounded-xl bg-page/50 border border-border/50 p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">
              마지막 알림 발생
            </p>
            <p className="text-[20px] font-bold text-foreground tabular-nums">
              {lastAlertTime.split(" ")[1]}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {lastAlertTime.split(" ")[0]}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">오늘 알림 수</span>
              <span className="font-semibold text-foreground">
                {todayAlerts.length}건
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">긴급 알림</span>
              <span
                className={`font-semibold ${hasCriticalToday ? "text-destructive" : "text-muted-foreground/40"}`}
              >
                {todayAlerts.filter((a) => a.level === "critical").length}건
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">경고 알림</span>
              <span className="font-semibold text-warning">
                {todayAlerts.filter((a) => a.level === "warning").length}건
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
