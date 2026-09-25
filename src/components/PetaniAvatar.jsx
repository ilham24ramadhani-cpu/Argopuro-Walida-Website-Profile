import { useState } from 'react';
import { petaniFotoUrl, petaniInisial, petaniNama } from '../utils/polygon';

export default function PetaniAvatar({ item, size = 'md' }) {
  const [broken, setBroken] = useState(false);
  const nama = petaniNama(item) || 'Petani';
  const url = petaniFotoUrl(item);
  const showImg = Boolean(url) && !broken;

  return (
    <div
      className={`petani-avatar petani-avatar--${size}`}
      aria-hidden={showImg ? undefined : true}
    >
      {showImg ? (
        <img src={url} alt={nama} onError={() => setBroken(true)} />
      ) : (
        <span className="petani-avatar-fallback">{petaniInisial(item)}</span>
      )}
    </div>
  );
}
