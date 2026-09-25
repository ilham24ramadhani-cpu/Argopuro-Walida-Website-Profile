import { company } from '../content/company';

export default function Footer() {
  return (
    <footer className="footer">
      {company.nama} · {company.bidang}
    </footer>
  );
}
