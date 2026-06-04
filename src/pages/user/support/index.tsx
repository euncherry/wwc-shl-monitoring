import { useState } from "react";
import {
  Headphones,
  Play,
  Phone,
  Mail,
  User,
  BookOpen,
  ExternalLink,
} from "lucide-react";

/* ══════════════════════════════════════════════════════
   사용 가이드 데이터
   ══════════════════════════════════════════════════════ */

const guides = [
  {
    id: "basic",
    title: "기본 사용법",
    description:
      "히어링루프 시스템의 기본적인 조작 방법과 대시보드 사용법을 알아봅니다.",
    youtubeId: "JyNNcF1Oah8",
    duration: "5:30",
  },
];

/* ══════════════════════════════════════════════════════
   기술 지원 담당자 데이터
   ══════════════════════════════════════════════════════ */

const supportContact = {
  name: "김상기 실장",
  phone: "1588-1234",
  phoneHours: "평일 10:00 - 18:00",
  email: "support@hearingloop.kr",
};

/* ══════════════════════════════════════════════════════
   YouTube 썸네일 컴포넌트
   ══════════════════════════════════════════════════════ */

function YouTubeEmbed({
  videoId,
  title,
  duration,
}: {
  videoId: string;
  title: string;
  duration: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: "16/9" }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="group relative w-full overflow-hidden rounded-xl cursor-pointer"
      style={{ aspectRatio: "16/9" }}
    >
      {/* YouTube 썸네일 */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 재생 버튼 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
          <Play className="h-7 w-7 text-primary ml-1" fill="currentColor" />
        </div>
      </div>

      {/* 영상 길이 태그 */}
      <div className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-0.5 text-[12px] font-semibold text-white tabular-nums">
        {duration}
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function UserSupport() {
  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="pb-2">
        <h2 className="text-2xl font-bold text-foreground tracking-tight mt-2">
          기술 지원
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          기술적인 문제나 도움이 필요하신 경우 지원을 요청하세요.
        </p>
      </div>

      {/* ─── 사용 가이드 ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border bg-page/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">사용 가이드</h3>
          <p className="ml-2 text-[12px] text-muted-foreground">
            히어링루프 시스템 사용에 대한 상세한 가이드를 확인하세요.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {guides.map((guide) => (
              <div key={guide.id} className="space-y-4">
                {/* 영상 썸네일 */}
                <YouTubeEmbed
                  videoId={guide.youtubeId}
                  title={guide.title}
                  duration={guide.duration}
                />

                {/* 영상 정보 */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-[15px] font-bold text-foreground">
                      {guide.title}
                    </h4>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                      {guide.description}
                    </p>
                  </div>
                  <a
                    href={`https://youtu.be/${guide.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:bg-page hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    YouTube에서 보기
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 지원팀 연락처 ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border bg-page/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Headphones className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            지원팀 연락처
          </h3>
        </div>

        <div className="px-6 divide-y divide-border/50">
          {/* 담당자 */}
          <div className="flex items-start gap-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 shrink-0 mt-0.5">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground mb-1">담당자</p>
              <p className="text-[14px] font-semibold text-foreground">
                {supportContact.name}
              </p>
            </div>
          </div>

          {/* 전화 */}
          <div className="flex items-start gap-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 shrink-0 mt-0.5">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground mb-1">전화</p>
              <div className="flex items-center gap-2.5">
                <a
                  href={`tel:${supportContact.phone}`}
                  className="text-[14px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  {supportContact.phone}
                </a>
                <span className="rounded-full bg-page px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {supportContact.phoneHours}
                </span>
              </div>
            </div>
          </div>

          {/* 이메일 */}
          <div className="flex items-start gap-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground mb-1">이메일</p>
              <a
                href={`mailto:${supportContact.email}`}
                className="text-[14px] font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                {supportContact.email}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 안내 문구 ─── */}
      <div className="rounded-xl bg-page/50 border border-border/50 px-5 py-3 text-[12px] text-muted-foreground">
        긴급한 장애 발생 시 전화 문의를 우선 권장드립니다. 이메일 문의는 영업일
        기준 1~2일 내 답변드립니다.
      </div>
    </div>
  );
}
