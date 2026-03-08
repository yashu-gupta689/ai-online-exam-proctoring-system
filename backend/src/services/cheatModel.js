export function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

export function predictFromCounts({ gaze = 0, faceMissing = 0, phone = 0, tabSwitch = 0 } = {}) {
  const fgaze = Math.min(1, gaze / 10);
  const fface = Math.min(1, faceMissing / 5);
  const fphone = Math.min(1, phone / 1);
  const ftab = Math.min(1, tabSwitch / 5);
  const b0 = -2.0;
  const wGaze = 1.2;
  const wFace = 1.4;
  const wPhone = 2.0;
  const wTab = 0.8;
  const z = b0 + wGaze * fgaze + wFace * fface + wPhone * fphone + wTab * ftab;
  return sigmoid(z);
}
