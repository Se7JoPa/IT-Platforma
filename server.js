'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {createAuth} = require('./auth');
const {seed, iso} = require('./seed');
const dbPath = process.env.COLLEGE_DB || path.join(__dirname,'data','college.sqlite');
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=4000;');
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result=fn(); db.exec('COMMIT'); return result; }
  catch(err) { db.exec('ROLLBACK'); throw err; }
}
transaction(()=>{
  db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
  if(db.prepare('PRAGMA user_version').get().user_version===0) {
    seed(db);
    db.exec('PRAGMA user_version=1');
  }
});
const auth = createAuth(db, transaction);
const all=(sql,...args)=>db.prepare(sql).all(...args);
const one=(sql,...args)=>db.prepare(sql).get(...args);
const run=(sql,...args)=>db.prepare(sql).run(...args);
function snapshot() {
  return {
    today:iso(new Date()),
    students:all('SELECT * FROM students ORDER BY name'),
    courses:all(`SELECT c.*,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) AS headcount,
      (SELECT ROUND(AVG(value),2) FROM grades g WHERE g.course_id=c.id) AS average
      FROM courses c ORDER BY c.id`),
    subjects:all('SELECT * FROM subjects ORDER BY id'),
    enrollments:all('SELECT * FROM enrollments'),
    grades:all('SELECT * FROM grades ORDER BY graded_on DESC,id DESC'),
    byStudent:all(`SELECT e.course_id,e.student_id,ROUND(AVG(g.value),2) AS average,COUNT(g.id) AS total
      FROM enrollments e LEFT JOIN grades g USING(course_id,student_id) GROUP BY e.course_id,e.student_id`),
    bySubject:all(`SELECT e.course_id,e.student_id,s.id AS subject_id,ROUND(AVG(g.value),2) AS average,COUNT(g.id) AS total
      FROM enrollments e JOIN subjects s USING(course_id) LEFT JOIN grades g ON g.subject_id=s.id AND g.student_id=e.student_id
      GROUP BY e.course_id,e.student_id,s.id`),
    average:one('SELECT ROUND(AVG(value),2) AS n FROM grades JOIN courses ON course_id=courses.id WHERE ended_on IS NULL').n
  };
}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function field(obj,key,label,max=120,required=true){
  const value=obj[key]??'';
  if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail('Проверьте поле «'+label+'».');
  return value.trim();
}
function integer(v,min,max,label){
  if((typeof v!=='string'&&typeof v!=='number')||!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>max)fail('Проверьте поле «'+label+'».');
  return Number(v);
}
function date(v,label){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||v<'1900-01-01'||v>iso(new Date()))fail('Проверьте дату в поле «'+label+'».');
  const d=new Date(v+'T12:00:00Z');
  if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,10)!==v)fail('Укажите существующую дату.');
  return v;
}
function active(id){
  const c=one('SELECT * FROM courses WHERE id=?',id);
  if(!c)fail('Курс не найден.',404);
  if(c.ended_on)fail('Этот курс в архиве.',409);
  return c;
}
function student(id){
  if(!one('SELECT id FROM students WHERE id=?',id))fail('Ученик не найден.',404);
}
function mutate(route,b){
  const cid=()=>integer(b.course_id,1,Number.MAX_SAFE_INTEGER,'Курс');
  const sid=()=>integer(b.student_id,1,Number.MAX_SAFE_INTEGER,'Ученик');
  switch(route){
    case 'students': {
      const name=field(b,'name','ФИО');
      const birthday=date(b.birthday,'Дата рождения');
      const email=field(b,'email','Почта',160,false),phone=field(b,'phone','Телефон',32,false);
      if(!email&&!phone)fail('Укажите телефон или электронную почту.');
      if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Проверьте адрес почты.');
      if(!['Мужской','Женский','Не указан'].includes(b.gender))fail('Выберите пол.');
      const id=Number(run('INSERT INTO students(name,birthday,gender,email,phone,year) VALUES(?,?,?,?,?,?)',
        name,birthday,b.gender,email,phone,integer(b.year,1,6,'Курс обучения')).lastInsertRowid);
      if(b.course_id){active(cid());run('INSERT INTO enrollments VALUES(?,?)',cid(),id);}
      return id;
    }
    case 'delete-student': student(sid());run('DELETE FROM students WHERE id=?',sid());return;
    case 'courses': {
      const name=field(b,'name','Название курса'),start=date(b.started_on,'Начало курса');
      if(all('SELECT name FROM courses').some(c=>c.name.toLowerCase()===name.toLowerCase()))fail('Курс с таким названием уже есть.',409);
      return Number(run('INSERT INTO courses(name,started_on) VALUES(?,?)',name,start).lastInsertRowid);
    }
    case 'enroll': {
      active(cid());student(sid());
      if(one('SELECT 1 FROM enrollments WHERE course_id=? AND student_id=?',cid(),sid()))fail('Ученик уже зачислен.',409);
      run('INSERT INTO enrollments VALUES(?,?)',cid(),sid());return;
    }
    case 'subjects': {
      active(cid());
      const name=field(b,'name','Предмет');
      if(all('SELECT name FROM subjects WHERE course_id=?',cid()).some(s=>s.name.toLowerCase()===name.toLowerCase()))fail('Этот предмет уже есть на курсе.',409);
      run('INSERT INTO subjects(course_id,name,teacher) VALUES(?,?,?)',cid(),name,field(b,'teacher','Преподаватель',120,false));return;
    }
    case 'grades': {
      const course=active(cid()), subject=integer(b.subject_id,1,Number.MAX_SAFE_INTEGER,'Предмет');
      if(!one('SELECT 1 FROM enrollments WHERE course_id=? AND student_id=?',cid(),sid()))fail('Выберите ученика этого курса.');
      if(!one('SELECT id FROM subjects WHERE id=? AND course_id=?',subject,cid()))fail('Выберите предмет этого курса.');
      const day=date(b.graded_on,'Дата оценки');
      if(day<course.started_on)fail('Оценка не может быть выставлена до начала курса.');
      run('INSERT INTO grades(course_id,subject_id,student_id,value,graded_on) VALUES(?,?,?,?,?)',
        cid(),subject,sid(),integer(b.value,2,5,'Оценка'),day);return;
    }
    case 'archive': {
      const course=active(cid()), day=date(b.ended_on,'Дата окончания');
      const last=one('SELECT max(graded_on) AS day FROM grades WHERE course_id=?',cid()).day;
      if(day<course.started_on||(last&&day<last))fail('Дата окончания должна быть не раньше начала курса и последней оценки.');
      run('UPDATE courses SET ended_on=? WHERE id=?',day,cid());return;
    }
    default:fail('Страница не найдена.',404);
  }
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpeg':'image/jpeg'};
function json(res,status,data){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const pathname=url.pathname;
    const action=pathname.slice(5);
    const isAuthAction=req.method==='POST' && ['register','login','logout'].some(name=>pathname==='/api/'+name);
    if(req.method==='GET' && ['/', '/index.html','/auth.html'].includes(pathname)){
      const signedIn=Boolean(auth.current(req));
      const destination=signedIn && pathname==='/auth.html' ? '/' :
        (!signedIn && pathname!=='/auth.html' ? '/auth.html' : null);
      res.setHeader('Cache-Control','no-store');
      if(destination){res.writeHead(303,{Location:destination});return res.end();}
    }
    if(pathname.startsWith('/api/') && !isAuthAction){
      const account=auth.current(req);
      if(!account)fail('Войдите в аккаунт.',401);
      if(req.method==='GET' && pathname==='/api/state')return json(res,200,{...snapshot(),account});
    }
    if(req.method==='POST'&&url.pathname.startsWith('/api/')){
      if(req.headers.origin && req.headers.origin!=='http://'+req.headers.host)fail('Недопустимый источник запроса.',403);
      if(req.headers['content-type']?.split(';')[0]!=='application/json')fail('Требуется JSON.',415);
      const chunks=[];
      let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>16384)fail('Слишком большой запрос.',413);chunks.push(chunk);}
      let b;
      try{b=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('Некорректный JSON.');}
      if(!b||typeof b!=='object'||Array.isArray(b))fail('Некорректные данные.');
      if(isAuthAction){await auth.handle(action,b,req,res);return json(res,200,{ok:true});}
      const id=transaction(()=>mutate(action,b));return json(res,200,{ok:true,id});
    }
    const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(req.method!=='GET'||!/^[a-zA-Z0-9_.-]+$/.test(name)||!mime[path.extname(name)])fail('Страница не найдена.',404);
    const file=path.join(__dirname,'public',name);
    if(!fs.existsSync(file))fail('Файл не найден.',404);
    res.writeHead(200,{'Content-Type':mime[path.extname(name)],'X-Content-Type-Options':'nosniff'});
    res.end(fs.readFileSync(file));
  }catch(err){if(!err.status)console.error(err);json(res,err.status||500,{error:err.status?err.message:'Ошибка сервера.'});}
});
const port=Number(process.env.PORT||3000);
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?'Порт занят. Закройте второй экземпляр или задайте другой PORT.':err.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log('ИТ Платформа запущена: http://127.0.0.1:'+port));
