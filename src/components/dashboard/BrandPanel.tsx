/* ══════════════════════════════════════════════════════
   브랜드 패널 (디자인 B — 라이트)

   대시보드 우측 열 맨 아래에 놓는 브랜드 블록.
   배너와 같은 어휘를 쓴다: 28px 격자 · 하단 대각선 면(#E4EEFB) · 파문 링 + T 배지.
   수치가 아니라 '이 시스템이 무엇을 위한 것인지'를 말하는 자리라 데이터 의존이 없다.

   ⚠️ 파문 링·T 배지는 절대 배치라 폭이 좁으면 텍스트를 덮는다.
      링 블록에 고정 높이(150px)를 주고 본문 max-width를 250px로 묶어 겹침을 막는다.
   ══════════════════════════════════════════════════════ */

export function BrandPanel({ footnote }: { footnote?: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#DDE6F2] bg-white p-[26px]">
      {/* 격자 텍스처 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(36,107,209,0.05) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(36,107,209,0.05) 0 1px,transparent 1px 28px)',
        }}
      />
      {/* 하단 대각선 면 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-[#E4EEFB]"
        style={{ clipPath: 'polygon(0 34%,100% 0,100% 100%,0 100%)' }}
      />

      <p className="relative font-mono text-[10px] tracking-[0.14em] text-[#4E70A3]">
        HEARING LOOP · TELECOIL
      </p>
      <h3 className="relative mt-2.5 text-[21px] font-extrabold leading-[1.45] tracking-[-0.01em] text-[#132B52]">
        안내방송이
        <br />
        모두에게 닿도록
      </h3>
      <p className="relative mt-2.5 max-w-[250px] text-[13px] leading-[1.65] text-[#3D5474]">
        보청기·인공와우 사용자에게 잡음 없이 선명한 소리를 전달합니다.
      </p>

      {/* 파문 링 + T 배지 */}
      <div className="relative mt-1 h-[150px]">
        <span
          aria-hidden
          className="absolute bottom-16 right-14 -mb-[65px] -mr-[65px] h-[130px] w-[130px] rounded-full border-[1.5px] border-[rgba(36,107,209,0.30)]"
        />
        {[0, 1.5, 3].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="hl-ripple absolute bottom-16 right-14 -mb-[105px] -mr-[105px] h-[210px] w-[210px] rounded-full border-[1.5px] border-[rgba(36,107,209,0.28)]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span
          aria-hidden
          className="absolute bottom-16 right-14 -mb-7 -mr-7 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#26266B] shadow-[0_8px_20px_rgba(38,38,107,0.35)]"
        >
          <span className="text-[26px] font-extrabold leading-none text-white">T</span>
        </span>
        {footnote && (
          <span className="absolute bottom-0 left-0 text-[11px] font-semibold text-[#4E70A3]">{footnote}</span>
        )}
      </div>
    </section>
  )
}
