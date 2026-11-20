'use strict';
const names = [
 'Волкова Анна Сергеевна','Соколов Михаил Андреевич','Лебедева Полина Игоревна','Кузнецов Артём Олегович',
 'Морозова Софья Павловна','Белов Егор Антонович','Орлова Алиса Денисовна','Крылов Иван Петрович',
 'Новикова Дарья Романовна','Мельников Лев Ильич','Тимофеева Ева Олеговна','Фролов Никита Игоревич',
 'Иванова Мария Ильинична','Васильев Максим Олегович','Петрова Варвара Андреевна','Смирнов Глеб Павлович'
];
function iso(d) { return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function seed(db) {
 const now = new Date(), y = now.getFullYear() - Number(now.getMonth()<8);
 const courses = [
  ['Разработка ПО',['Алгоритмы','Веб-разработка','Базы данных']],
  ['Цифровой дизайн',['Типографика','Дизайн интерфейсов']],
  ['Сетевые технологии',['Компьютерные сети','Администрирование']],
  ['Аналитика данных',['Статистика','Основы SQL']],
  ['Основы информатики',['Информатика']]
 ];
 const teachers=['Громова Ирина Викторовна','Наумов Антон Олегович','Кудрявцев Павел Ильич'];
 names.forEach((name,i)=>db.prepare('INSERT INTO students(name,birthday,gender,email,year) VALUES(?,?,?,?,?)')
  .run(name,iso(new Date(y-17-i%3,i%12,2+i)),i%2?'Мужской':'Женский','student'+(i+1)+'@example.org',1+i%3));
 courses.forEach(([name,subjects],i)=>{
  const old=i===4, start=(old?y-1:y)+'-09-01';
  const cid=Number(db.prepare('INSERT INTO courses(name,started_on,ended_on) VALUES(?,?,?)').run(name,start,old?y+'-06-30':null).lastInsertRowid);
  const ids=subjects.map((s,k)=>Number(db.prepare('INSERT INTO subjects(course_id,name,teacher) VALUES(?,?,?)').run(cid,s,teachers[(i+k)%3]).lastInsertRowid));
  names.forEach((_,j)=>{
   if((j+i)%4!==0 && (j+2*i)%5!==0) return;
   db.prepare('INSERT INTO enrollments VALUES(?,?)').run(cid,j+1);
   ids.forEach((sid,k)=>{
    for(let t=0;t<2;t++){
     const date=new Date(old?y+'-06-25T12:00:00':now);
     date.setDate(date.getDate()-(j+k+t*4)%13);
     db.prepare('INSERT INTO grades(course_id,subject_id,student_id,value,graded_on) VALUES(?,?,?,?,?)')
      .run(cid,sid,j+1,[5,4,5,3,4,5,4][(i+j+k+t)%7],iso(date)<start?start:iso(date));
    }
   });
  });
 });
}
module.exports={seed,iso};
