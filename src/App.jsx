import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, NavLink, Routes, Route, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, UserRound, Sun, Moon, ArrowRight, Minus, Plus, Trash2, SlidersHorizontal, Package, ShieldCheck, Truck, LogOut } from 'lucide-react';
const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const pictures = { airpods: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=850&q=85', watch: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=850&q=85', ipad: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=850&q=85', speaker: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=850&q=85', macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=850&q=85', iphone: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=850&q=85', other: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=850&q=85' };
const api = async (path, opts = {}) => {
    const token = localStorage.getItem('dylapip_token');
    let response;
    try {
        response = await fetch('/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...opts.headers }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    }
    catch {
        throw Error('Не удалось подключиться к серверу. Запустите npm run dev.');
    }
    let data;
    try {
        data = await response.json();
    }
    catch {
        throw Error('Некорректный ответ сервера');
    }
    if (!response.ok)
        throw Error(data.error || 'Ошибка запроса');
    return data;
};
function Shop() {
    const [products, setProducts] = useState([]), [categories, setCategories] = useState([]), [user, setUser] = useState(null), [cart, setCart] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dylapip_cart') || '{}');
        }
        catch {
            return {};
        }
    }), [theme, setTheme] = useState(() => localStorage.getItem('dylapip_theme') || 'light'), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [selected, setSelected] = useState([]), [query, setQuery] = useState(''), [saleOnly, setSaleOnly] = useState(false);
    const navigate = useNavigate();
    const refresh = async () => {
        setLoading(true);
        setError('');
        try {
            const [p, c, u] = await Promise.all([api('/services'), api('/categories'), api('/me')]);
            setProducts(p);
            setCategories(c);
            setUser(u);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { refresh(); }, []);
    useEffect(() => { localStorage.setItem('dylapip_cart', JSON.stringify(cart)); }, [cart]);
    useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('dylapip_theme', theme); }, [theme]);
    const toast = t => { setNotice(t); setTimeout(() => setNotice(''), 3500); };
    const add = id => { setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })); toast('Товар добавлен в корзину'); };
    const change = (id, n) => setCart(c => {
        const next = { ...c };
        if (n <= 0)
            delete next[id];
        else
            next[id] = n;
        return next;
    });
    const price = p => Math.round(p.price * (100 - p.discount) / 100);
    const lines = products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] }));
    const subtotal = lines.reduce((n, p) => n + price(p) * p.quantity, 0);
    const count = lines.reduce((n, p) => n + p.quantity, 0);
    const filtered = products.filter(p => (!selected.length || selected.includes(p.categoryId)) && (!saleOnly || p.discount > 0) && [p.name, p.description].join(' ').toLowerCase().includes(query.toLowerCase()));
    const onLogin = async (token) => { localStorage.setItem('dylapip_token', token); await refresh(); };
    const logout = async () => {
        try {
            await api('/auth/logout', { method: 'POST' });
        }
        catch { }
        localStorage.removeItem('dylapip_token');
        setUser(null);
        toast('Вы вышли из аккаунта');
        navigate('/');
    };
    const emojis = {airpods:"🎧",watch:"⌚",ipad:"📱",speaker:"🔊",macbook:"💻",iphone:"📱"};
    const card = p => <article className="product" key={p.id}><div className="product-art">{emojis[p.image] || "📦"}{p.discount > 0 && <span className="discount">−{p.discount}%</span>}</div><div className="product-body"><p className="product-desc">{p.description}</p><h2>{p.name}</h2><strong>{money(price(p))}</strong>{p.discount > 0 && <del>{money(p.price)}</del>}<div className="product-actions"><button onClick={() => add(p.id)}>+ В корзину</button><button className="subtle" onClick={() => {add(p.id);navigate('/cart');}}>К корзине →</button></div></div></article>;
    return <div className={`app ${theme === 'dark' ? 'dark' : ''}`}><header className="header"><div className="header-inner"><Link className="logo" to="/">dylapip<span>.</span>shop</Link><nav><NavLink to="/" end>Главная</NavLink><NavLink to="/catalog">Каталог</NavLink><NavLink to="/cart">Корзина ({count})</NavLink><NavLink to={user ? "/profile" : "/login"}>{user ? "Кабинет" : "Вход"}</NavLink>{user?.role === "admin" && <NavLink to="/admin">Админ-панель</NavLink>}</nav><button className="theme-toggle" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>{theme === "light" ? "🌙 Тёмная" : "☀️ Светлая"}</button></div></header>{notice && <div className="toast">{notice}</div>}{error && <div className="alert">{error} <button onClick={refresh}>Повторить</button></div>}
    <Routes><Route path="/" element={<><section className="hero"><div className="eyebrow">Новая коллекция • 2026</div><h1>Вещи, которые делают<br/><em>каждый день лучше.</em></h1><p>Техника, аксессуары и маленькие радости — в одном месте.</p><Link className="primary" to="/catalog">Смотреть каталог →</Link><div className="hero-art" aria-hidden="true">✦ &nbsp; ◉ &nbsp; ✳</div></section><div className="benefits"><span><Truck /> Удобное оформление заказа</span><span><ShieldCheck /> Персональные скидки</span><span><Package /> Новые технологии каждый день</span></div><section className="section"><div className="section-head"><div><span className="eyebrow">ВЫБОР ПОКУПАТЕЛЕЙ</span><h2>Популярные товары</h2></div><Link to="/catalog" className="text-link">Весь каталог <ArrowRight size={18}/></Link></div>{loading ? <div className="state">Загружаем товары…</div> : <div className="product-grid">{products.slice(0, 4).map(card)}</div>}</section><section className="banner"><div><span>ТВОИ ПРЕИМУЩЕСТВА</span><h2>Больше возможностей.<br />Меньше лишнего.</h2><p>Создай аккаунт и получи персональный купон WELCOME.</p><Link to={user ? '/catalog' : '/login'} className="primary light">{user ? 'Выбрать товар' : 'Присоединиться'} <ArrowRight size={18}/></Link></div><div className="banner-art">✳</div></section></>}/>
    <Route path="/catalog" element={<main className="section catalog"><div className="page-title"><span className="eyebrow">ПОДБОРКА ДЛЯ ТЕБЯ</span><h1>Каталог техники</h1><p>Всё самое нужное — в одном месте.</p></div><div className="catalog-layout"><aside className="sidebar"><div className="aside-title"><SlidersHorizontal size={18}/> Фильтры</div><h4>Категории</h4><label className="check"><input type="checkbox" checked={!selected.length} onChange={() => setSelected([])}/> Все категории</label>{categories.map(c => <label className="check" key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(a => a.includes(c.id) ? a.filter(x => x !== c.id) : [...a, c.id])}/>{c.name}</label>)}<hr /><h4>Предложения</h4><label className="check"><input type="checkbox" checked={saleOnly} onChange={e => setSaleOnly(e.target.checked)}/> Только со скидкой</label><button className="reset" onClick={() => { setSelected([]); setSaleOnly(false); setQuery(''); }}>Сбросить фильтры</button></aside><div className="catalog-main"><div className="catalog-tools"><span>Найдено: {filtered.length}</span><div className="search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по каталогу"/></div></div>{loading ? <div className="state">Загрузка каталога…</div> : filtered.length ? <div className="product-grid">{filtered.map(card)}</div> : <div className="state">Ничего не найдено. Попробуйте другие фильтры.</div>}</div></div></main>}/>
    <Route path="/cart" element={<main className="section cart-page"><div className="page-title"><span className="eyebrow">ВАШ ВЫБОР</span><h1>Корзина <small>({count})</small></h1></div>{!lines.length ? <div className="empty"><ShoppingBag size={56}/><h2>Здесь пока пусто</h2><p>Добавьте что-нибудь из каталога.</p><Link className="primary" to="/catalog">Перейти к покупкам <ArrowRight size={17}/></Link></div> : <div className="cart-layout"><div className="cart-list">{lines.map(p => <div className="cart-item" key={p.id}><span className="cart-emoji">{emojis[p.image] || "📦"}</span><div className="cart-desc"><span className="eyebrow">{categories.find(c => c.id === p.categoryId)?.name}</span><h3>{p.name}</h3><span>{money(price(p))} за шт.</span></div><div className="quantity"><button onClick={() => change(p.id, p.quantity - 1)}><Minus size={15}/></button><b>{p.quantity}</b><button onClick={() => change(p.id, p.quantity + 1)}><Plus size={15}/></button></div><strong>{money(price(p) * p.quantity)}</strong><button className="trash" onClick={() => change(p.id, 0)}><Trash2 size={19}/></button></div>)}</div><Checkout user={user} lines={lines} subtotal={subtotal} clear={() => setCart({})} toast={toast}/></div>}</main>}/>
    <Route path="/login" element={<Auth user={user} onLogin={onLogin}/>}/>
    <Route path="/profile" element={user ? <Profile user={user} logout={logout}/> : <Auth user={user} onLogin={onLogin}/>}/>
    <Route path="/admin" element={user?.role === 'admin' ? <Admin categories={categories} products={products} refresh={refresh} toast={toast}/> : <main className="section"><h2>Доступ запрещён</h2><p>Эта страница доступна администратору.</p></main>}/>
    <Route path="*" element={<main className="section"><h2>Страница не найдена</h2><Link to="/">На главную</Link></main>}/></Routes><footer><div><Link className="logo" to="/">dylapip<span>.</span>shop</Link><p>Электроника для твоего ритма жизни.</p></div><span>Учебный интернет-магазин · 2026</span><span>Оплата в деморежиме</span></footer></div>;
}
function Auth({ user, onLogin }) {
    const nav = useNavigate();
    const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => {
        if (user)
            nav('/profile');
    }, [user]);
    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password) {
            setError('Заполните все поля');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Введите корректный email');
            return;
        }
        setBusy(true);
        try {
            if (mode === 'register') {
                await api('/auth/register', { method: 'POST', body: { email, password } });
            }
            const r = await api('/auth/login', { method: 'POST', body: { email, password } });
            await onLogin(r.token);
            nav('/profile');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    return <main className="auth-wrap"><div className="auth-side"><span>DY L A P I P</span><h2>Твой мир.<br />Твои технологии.</h2><p>Все любимые устройства в одном месте.</p></div><form className="auth-card" onSubmit={submit}><span className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h1>{mode === 'login' ? 'С возвращением!' : 'Создать аккаунт'}</h1><p>{mode === 'login' ? 'Войди, чтобы продолжить покупки.' : 'Зарегистрируйся и получи купон WELCOME.'}</p><label>Email<input type="email" placeholder="example@mail.ru" value={email} onChange={e => setEmail(e.target.value)} required/></label><label>Пароль<input type="password" placeholder="Не менее 8 символов" value={password} onChange={e => setPassword(e.target.value)} required/></label>{error && <div className="form-error">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'} <ArrowRight size={18}/></button><div className="switch">{mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Регистрация' : 'Войти'}</button></div></form></main>;
}
function Checkout({ user, lines, subtotal, clear, toast }) {
    const [coupon, setCoupon] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const allowed = user?.coupons || [];
    const active = allowed.find(c => c.code === coupon);
    const total = Math.round(subtotal * (100 - (active?.percent || 0)) / 100);
    const nav = useNavigate();
    const submit = async () => {
        if (!user) {
            nav('/login');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const r = await api('/orders', { method: 'POST', body: { items: lines.map(x => ({ id: x.id, quantity: x.quantity })), coupon } });
            clear();
            toast('Заказ №' + r.id + ' оформлен! Оплата демонстрационная.');
            nav('/profile');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    return <div className="summary"><h3>Ваш заказ</h3><div className="sum-row"><span>Товары</span><b>{money(subtotal)}</b></div><div className="sum-row"><span>Скидка по купону</span><b>{active ? '-' + money(subtotal - total) : '—'}</b></div><label className="coupon-label">Персональный купон<select value={coupon} onChange={e => setCoupon(e.target.value)}><option value="">Без купона</option>{allowed.map(c => <option key={c.code} value={c.code}>{c.code} (−{c.percent}%)</option>)}</select></label>{!user && <p className="hint">Войдите, чтобы применить купон и оформить заказ.</p>}<hr /><div className="sum-total"><span>Итого</span><strong>{money(total)}</strong></div>{error && <div className="form-error">{error}</div>}<button className="primary wide" disabled={busy} onClick={submit}>{busy ? 'Оформляем…' : user ? 'Оформить заказ' : 'Войти для заказа'} <ArrowRight size={18}/></button><p className="hint">Учебный проект: реальные платежи не проводятся.</p></div>;
}
function Profile({ user, logout }) { const [orders, setOrders] = useState([]), [error, setError] = useState(''); useEffect(() => { api('/orders').then(setOrders).catch(e => setError(e.message)); }, []); return <main className="section profile"><span className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h1>Привет!</h1><p>{user.email} · {user.role === 'admin' ? 'Администратор' : 'Покупатель'}</p><div className="profile-grid"><div className="panel"><h3>Мои купоны</h3>{user.coupons.length ? user.coupons.map(c => <div className="coupon" key={c.code}><b>{c.code}</b><strong>−{c.percent}%</strong></div>) : <p>Купоны пока не назначены.</p>}</div><div className="panel"><h3>История заказов</h3>{error && <p className="form-error">{error}</p>}{orders.length ? orders.map(o => <div className="order" key={o.id}><span>Заказ №{o.id}<small>{o.createdAt}</small></span><strong>{money(o.total)}</strong></div>) : <p>Заказов пока нет.</p>}</div></div><button className="outline" onClick={logout}><LogOut size={17}/> Выйти из аккаунта</button></main>; }
function Admin({ categories, products, refresh, toast }) {
    const [tab, setTab] = useState('discount'), [users, setUsers] = useState([]), [coupons, setCoupons] = useState([]), [categoryName, setCategoryName] = useState(''), [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: '', discount: '0' }), [assign, setAssign] = useState({ userId: '', couponId: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => { Promise.all([api('/admin/users'), api('/admin/coupons')]).then(([u, c]) => { setUsers(u); setCoupons(c); }).catch(e => setError(e.message)); }, []);
    const act = async (fn) => {
        setBusy(true);
        setError('');
        try {
            await fn();
            await refresh();
            toast('Изменения сохранены');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    return <main className="section admin"><span className="eyebrow">УПРАВЛЕНИЕ МАГАЗИНОМ</span><h1>Панель администратора</h1><p>Управляйте скидками, товарами, категориями и купонами.</p><div className="tabs">{[['discount', 'Скидки'], ['categories', 'Категории'], ['products', 'Добавить товар'], ['coupons', 'Купоны']].map(([id, name]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{name}</button>)}</div>{error && <div className="form-error">{error}</div>}{tab === 'discount' && <div className="panel"><h3>Скидки на товары</h3><p className="hint">Изменения сразу отображаются в каталоге. Изначально скидки действуют на 2 из 6 товаров.</p>{products.map(p => <div className="admin-row" key={p.id}><span>{p.name}</span><div><input type="number" min="0" max="90" defaultValue={p.discount} key={p.id + '-' + p.discount} id={'discount-' + p.id}/><span>%</span><button disabled={busy} onClick={() => act(() => api('/admin/services/' + p.id + '/discount', { method: 'PATCH', body: { discount: Number(document.getElementById('discount-' + p.id).value) } }))}>Сохранить</button></div></div>)}</div>}{tab === 'categories' && <div className="panel"><h3>Категории</h3><div className="chips">{categories.map(c => <span key={c.id}>{c.name}</span>)}</div><form className="inline-form" onSubmit={e => { e.preventDefault(); act(async () => { await api('/admin/categories', { method: 'POST', body: { name: categoryName } }); setCategoryName(''); }); }}><input placeholder="Название новой категории" value={categoryName} onChange={e => setCategoryName(e.target.value)} required minLength={2}/><button className="primary" disabled={busy}>Добавить <Plus size={17}/></button></form><p className="hint">Новая категория автоматически появится в фильтре aside.</p></div>}{tab === 'products' && <form className="panel admin-form" onSubmit={e => { e.preventDefault(); act(async () => { await api('/admin/services', { method: 'POST', body: newItem }); setNewItem({ name: '', description: '', price: '', categoryId: '', discount: '0' }); }); }}><h3>Новый товар</h3><label>Название<input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required/></label><label>Описание<textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} required/></label><label>Цена в рублях<input type="number" min="0" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} required/></label><label>Категория<select value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })} required><option value="">Выберите категорию</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Скидка, %<input type="number" min="0" max="90" value={newItem.discount} onChange={e => setNewItem({ ...newItem, discount: e.target.value })}/></label><button className="primary" disabled={busy}>Добавить товар <Plus size={18}/></button></form>}{tab === 'coupons' && <form className="panel admin-form" onSubmit={e => { e.preventDefault(); act(() => api('/admin/assign-coupon', { method: 'POST', body: assign })); }}><h3>Назначить персональный купон</h3><label>Пользователь<select value={assign.userId} onChange={e => setAssign({ ...assign, userId: e.target.value })} required><option value="">Выберите пользователя</option>{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}</select></label><label>Купон<select value={assign.couponId} onChange={e => setAssign({ ...assign, couponId: e.target.value })} required><option value="">Выберите купон</option>{coupons.map(c => <option key={c.id} value={c.id}>{c.code} — {c.percent}%</option>)}</select></label><button className="primary" disabled={busy}>Назначить купон <ArrowRight size={18}/></button></form>}</main>;
}
export default function App() { return <BrowserRouter><Shop /></BrowserRouter>; }
