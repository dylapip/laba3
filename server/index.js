import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const db=new DatabaseSync(join(dir,'shop.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS Roles(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL); CREATE TABLE IF NOT EXISTS Users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role_id INTEGER NOT NULL,FOREIGN KEY(role_id) REFERENCES Roles(id)); CREATE TABLE IF NOT EXISTS Categories(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL); CREATE TABLE IF NOT EXISTS Services(id INTEGER PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,duration INTEGER NOT NULL DEFAULT 0,price INTEGER NOT NULL CHECK(price>=0),category_id INTEGER NOT NULL,discount INTEGER NOT NULL DEFAULT 0 CHECK(discount BETWEEN 0 AND 90),image TEXT NOT NULL DEFAULT '',FOREIGN KEY(category_id) REFERENCES Categories(id)); CREATE TABLE IF NOT EXISTS Coupons(id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,percent INTEGER NOT NULL CHECK(percent BETWEEN 0 AND 90)); CREATE TABLE IF NOT EXISTS UserCoupons(user_id INTEGER NOT NULL,coupon_id INTEGER NOT NULL,PRIMARY KEY(user_id,coupon_id),FOREIGN KEY(user_id) REFERENCES Users(id),FOREIGN KEY(coupon_id) REFERENCES Coupons(id)); CREATE TABLE IF NOT EXISTS Appointments(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,total INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'new',FOREIGN KEY(user_id) REFERENCES Users(id)); CREATE TABLE IF NOT EXISTS AppointmentItems(id INTEGER PRIMARY KEY,appointment_id INTEGER NOT NULL,service_id INTEGER NOT NULL,quantity INTEGER NOT NULL,unit_price INTEGER NOT NULL,FOREIGN KEY(appointment_id) REFERENCES Appointments(id),FOREIGN KEY(service_id) REFERENCES Services(id)); CREATE TABLE IF NOT EXISTS Payments(id INTEGER PRIMARY KEY,appointment_id INTEGER NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',method TEXT NOT NULL DEFAULT 'demo',FOREIGN KEY(appointment_id) REFERENCES Appointments(id)); CREATE TABLE IF NOT EXISTS Sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES Users(id));`);
const hash=p=>{const salt=randomUUID();return salt+':'+scryptSync(p,salt,64).toString('hex')};
const verify=(p,h)=>{const [salt,expected]=h.split(':');const got=scryptSync(p,salt,64);return timingSafeEqual(got,Buffer.from(expected,'hex'))};
if(!db.prepare('SELECT 1 FROM Roles LIMIT 1').get()){
 db.prepare('INSERT INTO Roles(id,name) VALUES(1,?),(2,?)').run('admin','customer');
 db.prepare('INSERT INTO Users(id,email,password_hash,role_id) VALUES(1,?,?,1)').run('admin@dylapip.shop',hash('Admin123!'));
 db.prepare('INSERT INTO Users(id,email,password_hash,role_id) VALUES(2,?,?,2)').run('user@dylapip.shop',hash('User123!'));
 ['Аудио','Носимые устройства','Планшеты','Ноутбуки','Смартфоны'].forEach(x=>db.prepare('INSERT INTO Categories(name) VALUES(?)').run(x));
 const items=[['AirPods Pro','Беспроводные наушники с активным шумоподавлением.',0,24990,1,15,'airpods'],['Apple Watch','Умные часы для спорта, уведомлений и повседневных задач.',0,39990,2,0,'watch'],['iPad Air','Лёгкий и мощный планшет для учёбы и творчества.',0,74990,3,0,'ipad'],['HomePod mini','Компактная умная колонка с насыщенным звучанием.',0,13990,1,0,'speaker'],['MacBook Air','Тонкий ноутбук для работы, проектов и путешествий.',0,119990,4,10,'macbook'],['iPhone','Смартфон с ярким дисплеем и отличной камерой.',0,99990,5,0,'iphone']];
 items.forEach(x=>db.prepare('INSERT INTO Services(name,description,duration,price,category_id,discount,image) VALUES(?,?,?,?,?,?,?)').run(...x));
 [['WELCOME',5],['SILVER',10],['GOLD',15]].forEach(x=>db.prepare('INSERT INTO Coupons(code,percent) VALUES(?,?)').run(...x));
 db.prepare('INSERT INTO UserCoupons(user_id,coupon_id) VALUES(2,1)').run();
}
const json=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'http://localhost:5173','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const fail=(s,m)=>{const e=new Error(m);e.status=s;throw e};
const one=(sql,...args)=>db.prepare(sql).get(...args);
const all=(sql,...args)=>db.prepare(sql).all(...args);
const session=req=>{const token=(req.headers.authorization||'').replace(/^Bearer /,'');return token?one('SELECT Users.id,Users.email,Roles.name AS role FROM Sessions JOIN Users ON Sessions.user_id=Users.id JOIN Roles ON Roles.id=Users.role_id WHERE Sessions.token=?',token):null};
const requireUser=req=>session(req)||fail(401,'Войдите в аккаунт');
const requireAdmin=req=>{const u=requireUser(req);if(u.role!=='admin')fail(403,'Доступ только для администратора');return u};
const body=async req=>{let raw='';for await(const part of req){raw+=part;if(raw.length>100000)fail(413,'Слишком большой запрос')}try{return JSON.parse(raw||'{}')}catch{fail(400,'Некорректный JSON')}};
const positiveInt=x=>Number.isInteger(Number(x))&&Number(x)>0;
const priceOf=s=>Math.round(s.price*(100-s.discount)/100);
const routes=async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;const method=req.method;
 if(method==='GET'&&path==='/api/categories')return json(res,200,all('SELECT * FROM Categories ORDER BY id'));
 if(method==='GET'&&path==='/api/services')return json(res,200,all('SELECT id,name,description,duration,price,category_id AS categoryId,discount,image FROM Services ORDER BY id'));
 if(method==='GET'&&path==='/api/me'){const u=session(req);return json(res,200,u?{...u,coupons:all('SELECT Coupons.code,Coupons.percent FROM UserCoupons JOIN Coupons ON Coupons.id=UserCoupons.coupon_id WHERE user_id=?',u.id)}:null)};
 if(method==='POST'&&path==='/api/auth/login'){
 const b=await body(req);if(typeof b.email!=='string'||typeof b.password!=='string'||!b.email.trim()||!b.password)fail(400,'Заполните email и пароль');
 const u=one('SELECT * FROM Users WHERE lower(email)=lower(?)',b.email.trim());if(!u||!verify(b.password,u.password_hash))fail(401,'Неверный email или пароль');const token=randomUUID();db.prepare('INSERT INTO Sessions(token,user_id) VALUES(?,?)').run(token,u.id);return json(res,200,{token});
 }
 if(method==='POST'&&path==='/api/auth/register'){
 const b=await body(req);if(typeof b.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)||typeof b.password!=='string'||b.password.length<8)fail(400,'Укажите email и пароль не короче 8 символов');
 if(one('SELECT 1 FROM Users WHERE lower(email)=lower(?)',b.email))fail(409,'Email уже зарегистрирован');const id=db.prepare('INSERT INTO Users(email,password_hash,role_id) VALUES(?,?,2)').run(b.email.toLowerCase(),hash(b.password)).lastInsertRowid;const coupon=one('SELECT id FROM Coupons WHERE code=?','WELCOME');if(coupon)db.prepare('INSERT INTO UserCoupons(user_id,coupon_id) VALUES(?,?)').run(id,coupon.id);return json(res,201,{message:'Аккаунт создан'});
 }
 if(method==='POST'&&path==='/api/auth/logout'){const token=(req.headers.authorization||'').replace(/^Bearer /,'');db.prepare('DELETE FROM Sessions WHERE token=?').run(token);return json(res,200,{ok:true})}
 if(method==='GET'&&path==='/api/orders'){const u=requireUser(req);return json(res,200,all('SELECT id,created_at AS createdAt,total,status FROM Appointments WHERE user_id=? ORDER BY id DESC',u.id))}
 if(method==='POST'&&path==='/api/orders'){
 const u=requireUser(req);const b=await body(req);if(!Array.isArray(b.items)||!b.items.length)fail(400,'Корзина пуста');const normalized=b.items.map(i=>{if(!positiveInt(i.id)||!positiveInt(i.quantity)||Number(i.quantity)>20)fail(400,'Неверное количество');const s=one('SELECT * FROM Services WHERE id=?',Number(i.id));if(!s)fail(400,'Товар не найден');return {s,quantity:Number(i.quantity)}});
 const ids=normalized.map(i=>i.s.id);if(new Set(ids).size!==ids.length)fail(400,'Повторяющиеся товары');let subtotal=normalized.reduce((n,i)=>n+priceOf(i.s)*i.quantity,0);let percent=0;
 if(b.coupon){const coupon=one('SELECT Coupons.percent FROM Coupons JOIN UserCoupons ON Coupons.id=UserCoupons.coupon_id WHERE UserCoupons.user_id=? AND Coupons.code=?',u.id,String(b.coupon).toUpperCase());if(!coupon)fail(400,'Купон не назначен вашему аккаунту');percent=coupon.percent}
 const total=Math.round(subtotal*(100-percent)/100);db.exec('BEGIN');try{const id=Number(db.prepare('INSERT INTO Appointments(user_id,total) VALUES(?,?)').run(u.id,total).lastInsertRowid);for(const i of normalized)db.prepare('INSERT INTO AppointmentItems(appointment_id,service_id,quantity,unit_price) VALUES(?,?,?,?)').run(id,i.s.id,i.quantity,priceOf(i.s));db.prepare('INSERT INTO Payments(appointment_id,amount,status,method) VALUES(?,?,?,?)').run(id,total,'pending','demo');db.exec('COMMIT');return json(res,201,{id,total,message:'Заказ создан. Оплата демонстрационная, деньги не списываются.'})}catch(e){db.exec('ROLLBACK');throw e}
 }
 if(method==='POST'&&path==='/api/admin/categories'){requireAdmin(req);const b=await body(req);const name=String(b.name||'').trim();if(name.length<2||name.length>50)fail(400,'Название категории: 2–50 символов');const id=Number(db.prepare('INSERT INTO Categories(name) VALUES(?)').run(name).lastInsertRowid);return json(res,201,{id,name})}
 if(method==='POST'&&path==='/api/admin/services'){requireAdmin(req);const b=await body(req);const name=String(b.name||'').trim(),description=String(b.description||'').trim(),price=Number(b.price),categoryId=Number(b.categoryId),discount=Number(b.discount||0);if(!name||!description||!Number.isInteger(price)||price<0||!positiveInt(categoryId)||!one('SELECT 1 FROM Categories WHERE id=?',categoryId)||!Number.isInteger(discount)||discount<0||discount>90)fail(400,'Проверьте данные товара');const id=Number(db.prepare('INSERT INTO Services(name,description,duration,price,category_id,discount,image) VALUES(?,?,0,?,?,?,?)').run(name,description,price,categoryId,discount,'other').lastInsertRowid);return json(res,201,{id})}
 const disc=path.match(/^\/api\/admin\/services\/(\d+)\/discount$/);if(method==='PATCH'&&disc){requireAdmin(req);const b=await body(req);const discount=Number(b.discount);if(!Number.isInteger(discount)||discount<0||discount>90)fail(400,'Скидка должна быть от 0 до 90%');const r=db.prepare('UPDATE Services SET discount=? WHERE id=?').run(discount,Number(disc[1]));if(!r.changes)fail(404,'Товар не найден');return json(res,200,{ok:true})}
 if(method==='GET'&&path==='/api/admin/users'){requireAdmin(req);return json(res,200,all('SELECT Users.id,Users.email,Roles.name AS role FROM Users JOIN Roles ON Roles.id=Users.role_id ORDER BY Users.id'))}
 if(method==='GET'&&path==='/api/admin/coupons'){requireAdmin(req);return json(res,200,all('SELECT * FROM Coupons ORDER BY percent'))}
 if(method==='POST'&&path==='/api/admin/assign-coupon'){requireAdmin(req);const b=await body(req);if(!positiveInt(b.userId)||!positiveInt(b.couponId)||!one('SELECT 1 FROM Users WHERE id=?',Number(b.userId))||!one('SELECT 1 FROM Coupons WHERE id=?',Number(b.couponId)))fail(400,'Выберите пользователя и купон');db.prepare('INSERT OR IGNORE INTO UserCoupons(user_id,coupon_id) VALUES(?,?)').run(Number(b.userId),Number(b.couponId));return json(res,200,{ok:true})}
 fail(404,'Маршрут не найден');
};
http.createServer(async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});return res.end()}try{await routes(req,res)}catch(e){const status=e.status||(String(e.message).includes('UNIQUE constraint')?409:500);if(status===500)console.error(e);json(res,status,{error:status===500?'Ошибка сервера':e.message})}}).listen(3001,'127.0.0.1',()=>console.log('API: http://127.0.0.1:3001/api'));
