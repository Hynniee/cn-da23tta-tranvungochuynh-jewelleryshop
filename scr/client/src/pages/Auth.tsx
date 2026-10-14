import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { request } from '../lib/api';

type AuthProps = { register?: boolean };
type FormState = { name: string; email: string; password: string };

export default function Auth({ register = false }: AuthProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = register ? '/auth/register' : '/auth/login';
      const data = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(form),
      });

      localStorage.setItem('mira_token', data.token);
      localStorage.setItem('mira_user', JSON.stringify(data.user));
      navigate(data.user.role === 'admin' ? '/admin' : '/account');
    } catch (err: any) {
      setError(err.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual-overlay" />
        <div className="auth-brand">
          <span className="auth-kicker">MIRA FINE JEWELRY & ATELIER</span>
          <h1>Mỗi tuyệt tác,<br /><em>một câu chuyện riêng.</em></h1>
          <p>Không gian dành cho những dấu ấn được chế tác để lưu giữ qua nhiều thế hệ.</p>
        </div>
        <div className="auth-promise">
          <ShieldCheck size={20} />
          <div><b>Đặc quyền MIRA</b><span>Bảo mật thông tin · Chứng nhận GIA · Dịch vụ trọn đời</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-box">
          <Link to="/" className="auth-logo">MIRA<span>FINE JEWELRY</span></Link>
          <div className="auth-heading">
            <span>{register ? 'TRỞ THÀNH THƯỢNG KHÁCH' : 'PRIVATE CLIENT ACCESS'}</span>
            <h2>{register ? 'Tạo Tài Khoản MIRA' : 'Chào Mừng Trở Lại'}</h2>
            <p>{register ? 'Tạo hồ sơ để lưu wishlist, theo dõi đơn hàng và nhận đặc quyền riêng.' : 'Đăng nhập để tiếp tục trải nghiệm dịch vụ cá nhân hóa của MIRA.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {register && (
              <label><span>HỌ VÀ TÊN</span><input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Nguyễn Minh Anh" required /></label>
            )}
            <label><span>EMAIL</span><div className="auth-input"><Mail size={16} /><input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@example.com" required /></div></label>
            <label><span>MẬT KHẨU</span><div className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Tối thiểu 6 ký tự" minLength={6} required /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Hiện mật khẩu">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>

            {!register && <div className="auth-options"><label className="remember"><input type="checkbox" /> Ghi nhớ đăng nhập</label><button type="button">Quên mật khẩu?</button></div>}
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" disabled={loading}>{loading ? 'ĐANG XỬ LÝ...' : register ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP'}</button>
          </form>

          <div className="auth-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link to={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</Link></div>
          {!register && <div className="auth-admin-note">Quản trị viên sử dụng cùng trang đăng nhập. Hệ thống sẽ tự chuyển đến Dashboard theo quyền tài khoản.</div>}
        </div>
      </section>
    </main>
  );
}
