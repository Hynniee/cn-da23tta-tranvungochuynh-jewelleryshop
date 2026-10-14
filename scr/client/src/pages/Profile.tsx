import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { token } from '../lib/api';

type User = { name?: string; email?: string; role?: string; phone?: string; birthday?: string };

function readUser(): User | null {
  try { return JSON.parse(localStorage.getItem('mira_user') || 'null'); }
  catch { return null; }
}

export default function Profile() {
  const user = useMemo(readUser, []);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [gender, setGender] = useState('Nữ');
  const [saved, setSaved] = useState(false);

  if (!token() || !user) return <Navigate to="/login" replace />;

  const initials = (name || email || 'M').split(' ').filter(Boolean).slice(-2).map(x => x[0]?.toUpperCase()).join('');

  function save(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem('mira_user', JSON.stringify({ ...user, name: name.trim(), email: email.trim(), phone: phone.trim(), birthday }));
    setSaved(true);
  }

  return <main className="profile-page">
    <div className="profile-crumb"><Link to="/">Trang chủ</Link><span>/</span><span>Tài khoản của tôi</span></div>
    <section className="profile-hero"><p>MIRA PRIVATE CLIENT</p><h1>Hồ Sơ Cá Nhân</h1><span>Quản lý thông tin và đặc quyền dành riêng cho khách hàng MIRA.</span></section>

    <div className="profile-shell">
      <aside className="profile-side">
        <div className="profile-user"><div className="profile-avatar">{initials || 'M'}</div><div><strong>{name || 'Khách hàng MIRA'}</strong><span>{email}</span></div></div>
        <nav className="profile-nav"><a className="active" href="#info">Thông tin cá nhân</a><Link to="/account">Đơn hàng của tôi</Link><a href="#address">Sổ địa chỉ</a><Link to="/wishlist">Danh sách yêu thích</Link><a href="#member">Đặc quyền thành viên</a></nav>
        <div className="profile-tier"><small>HẠNG THÀNH VIÊN</small><strong>MIRA GOLD</strong><p>Private Client · Ưu tiên lịch hẹn Salon</p><div><i /></div><span>6.800 / 10.000 điểm để lên Platinum</span></div>
      </aside>

      <div className="profile-main">
        <section id="info" className="profile-card">
          <div className="profile-card-head"><div><p>THÔNG TIN TÀI KHOẢN</p><h2>Thông Tin Cá Nhân</h2></div><span>Mọi thông tin được bảo mật bởi MIRA</span></div>
          <form className="profile-form" onSubmit={save}>
            <label><span>HỌ VÀ TÊN</span><input value={name} onChange={e=>{setName(e.target.value);setSaved(false)}} required /></label>
            <label><span>EMAIL</span><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setSaved(false)}} required /></label>
            <label><span>SỐ ĐIỆN THOẠI</span><input value={phone} onChange={e=>{setPhone(e.target.value);setSaved(false)}} placeholder="09xx xxx xxx" /></label>
            <label><span>NGÀY SINH</span><input type="date" value={birthday} onChange={e=>{setBirthday(e.target.value);setSaved(false)}} /></label>
            <label><span>GIỚI TÍNH</span><select value={gender} onChange={e=>setGender(e.target.value)}><option>Nữ</option><option>Nam</option><option>Khác</option></select></label>
            <label><span>MẬT KHẨU</span><div className="profile-password"><input value="••••••••••••" disabled /><button type="button">Đổi mật khẩu</button></div></label>
            <div className="profile-save"><span>{saved ? 'Thông tin đã được cập nhật.' : ''}</span><button>LƯU THAY ĐỔI</button></div>
          </form>
        </section>

        <section id="address" className="profile-card">
          <div className="profile-card-head"><div><p>GIAO HÀNG & PRIVATE SALON</p><h2>Sổ Địa Chỉ</h2></div><button>+ THÊM ĐỊA CHỈ</button></div>
          <div className="profile-addresses"><article><b>MẶC ĐỊNH</b><strong>{name || 'Khách hàng MIRA'}</strong><p>{phone || 'Chưa cập nhật số điện thoại'}</p><p>Chưa cập nhật địa chỉ giao hàng.</p><button>Chỉnh sửa</button></article><article className="add-address"><i>＋</i><strong>Thêm địa chỉ mới</strong><p>Lưu địa chỉ để thanh toán nhanh hơn ở lần mua tiếp theo.</p></article></div>
        </section>

        <section id="member" className="profile-benefits"><article><span>01</span><strong>Private Salon Priority</strong><p>Ưu tiên lịch hẹn riêng cùng chuyên gia kim hoàn MIRA.</p></article><article><span>02</span><strong>Lifetime Jewelry Spa</strong><p>Vệ sinh và chăm sóc tác phẩm định kỳ theo chính sách thành viên.</p></article><article><span>03</span><strong>Birthday Privilege</strong><p>Đặc quyền cá nhân hóa dành riêng trong tháng sinh nhật.</p></article></section>
      </div>
    </div>
  </main>;
}
