// Metindeki paragraf bloklarını (p) ekrandaki koordinatlarıyla haritalar
export function mapTextBlocks(containerId){
  const container = document.getElementById(containerId);
  const ps = container.querySelectorAll("p");
  const blocks = [];
  ps.forEach((p, idx) => {
    const r = p.getBoundingClientRect();
    blocks.push({ id: idx, top: r.top, bottom: r.bottom, text: p.innerText });
  });
  return blocks;
}

// Gaze Y koordinatına göre hangi blokta olduğumuzu bulur
export function detectBlockId(gazeY, blocks){
  for (const b of blocks) {
    if (gazeY >= b.top && gazeY <= b.bottom) return b.id;
  }
  return null;
}
