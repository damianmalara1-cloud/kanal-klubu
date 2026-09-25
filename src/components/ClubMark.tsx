import Image from 'next/image';

/** Herb klubu przy nagłówku. `alt=""` — dekoracja, nazwa klubu stoi obok tekstem (czytniki i testy widzą sam tekst). */
export function Crest({ size = 28 }: { size?: number }) {
  return <Image className="crest" src="/brand/uks-banino-crest.svg" alt="" width={size} height={Math.round((size * 271.8) / 285.8)} priority />;
}

export function ClubMark({ children = 'UKS Banino · Kanał Klubu' }: { children?: React.ReactNode }) {
  return (
    <p className="kicker brand-mark">
      <Crest />
      <span>{children}</span>
    </p>
  );
}
