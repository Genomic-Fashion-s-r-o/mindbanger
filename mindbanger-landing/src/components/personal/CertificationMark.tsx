import Image from 'next/image';
import './certification-mark.css';

// Visible artwork bounds remove inconsistent source padding without changing the logos.
const artwork: Record<string, { width: number; height: number; bounds: [number, number, number, number] }> = {
  CMA: { width: 694, height: 317, bounds: [34, 33, 660, 317] },
  CPD: { width: 1000, height: 1000, bounds: [98, 98, 902, 902] },
  ICAHP: { width: 1778, height: 833, bounds: [183, 0, 1755, 766] },
  IPHM: { width: 800, height: 770, bounds: [47, 32, 754, 739] },
  NCCAP: { width: 1000, height: 910, bounds: [39, 0, 961, 910] },
  Mindvalley: { width: 200, height: 100, bounds: [23, 15, 177, 85] },
};

export default function CertificationMark({ organisation }: { organisation: { name: string; file: string } }) {
  const { width, height, bounds: [left, top, right, bottom] } = artwork[organisation.name];
  const visibleWidth = right - left;
  const visibleHeight = bottom - top;
  return <span className="certification-mark">
    <span className="certification-mark-artwork" style={{
      aspectRatio: `${visibleWidth} / ${visibleHeight}`,
      width: `min(100%, calc(var(--certification-logo-height) * ${visibleWidth / visibleHeight}))`,
    }}>
      <Image src={`/certifications/${organisation.file}`} alt={`Logo ${organisation.name}`}
        width={width} height={height} sizes="(max-width: 760px) 150px, 190px"
        style={{ width: `${width / visibleWidth * 100}%`, height: `${height / visibleHeight * 100}%`,
          left: `${-left / visibleWidth * 100}%`, top: `${-top / visibleHeight * 100}%` }} />
    </span>
  </span>;
}
