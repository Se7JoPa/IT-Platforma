'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 home:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5"/>',
 book:'<path d="M12 6Q7 2 2 5v14q5-3 10 1 5-4 10-1V5q-5-3-10 1Zm0 0v14"/>',
 journal:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18m3-12h5m-5 4h4M3 7h3m-3 5h3m-3 5h3"/>',
 archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9m-10 4h6"/>',
 chart:'<path d="M3 20h18M6 16v-4m6 4V5m6 11V9"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>', right:'<path d="m9 6 6 6-6 6"/>',
 code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-5 2 2-14"/>',
 pen:'<path d="m4 4 11 3 4 8-5 5-8-4-2-12Zm0 0 8 8m4 9 5-5"/><circle cx="13" cy="13" r="1.5"/>',
 net:'<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4m-7 4v-4h14v4"/>',
 trend:'<path d="m3 17 6-6 4 3 8-9m-6 0h6v6"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 cap:'<path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v5q6 5 12 0v-5m4-2v6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 back:'<path d="M20 12H4m6-6-6 6 6 6"/>',trash:'<path d="M3 6h18M9 6V3h6v3m-10 0 1 15h12l1-15m-9 4v6m4-6v6"/>'
};
const ic=(n,size=19)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[n]+'</svg>';
const nav=[['home','Обзор','home'],['students','Ученики','users'],['courses','Курсы','book'],['journal','Журнал оценок','journal'],['reports','Успеваемость','chart'],['archive','Архив курсов','archive']];
const hash=()=>location.hash.slice(1).split('/');
const num=n=>n==null?'—':Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
const fmt=(d,opts={day:'numeric',month:'short',year:'numeric'})=>new Date(d+'T12:00:00').toLocaleDateString('ru-RU',opts);
const person=id=>state.students.find(x=>x.id===Number(id)),course=id=>state.courses.find(x=>x.id===Number(id)),subject=id=>state.subjects.find(x=>x.id===Number(id));
const active=()=>state.courses.filter(c=>!c.ended_on),members=cid=>state.students.filter(s=>state.enrollments.some(e=>e.student_id===s.id&&e.course_id===cid));
const subs=cid=>state.subjects.filter(s=>s.course_id===cid);
const initials=n=>n.split(/\s+/).slice(0,2).map(s=>s[0]).join('');
const palette=['sage','apricot','lilac','blue'],courseIcon=['code','pen','net','chart'];
const tile=c=>'<span class="tile '+palette[(c.id-1)%4]+'">'+ic(courseIcon[(c.id-1)%4])+'</span>';
const avatar=s=>'<span class="avatar '+palette[(s.id-1)%4]+'">'+esc(initials(s.name))+'</span>';
const courseLink=c=>'<a class="entity" href="#course/'+c.id+'">'+tile(c)+'<strong>'+esc(c.name)+'</strong></a>';
const studentLink=s=>'<a class="entity" href="#student/'+s.id+'">'+avatar(s)+'<strong>'+esc(s.name)+'</strong></a>';
const score=n=>n==null?'—':'<span class="score v'+Math.floor(n)+'">'+num(n)+'</span>';
const btn=(text,act,icon='plus',style='primary',id='')=>'<button type="button" class="button '+style+'" data-act="'+act+'" data-id="'+id+'">'+ic(icon,16)+esc(text)+'</button>';
const link=(text,href)=>'<a class="more" href="#'+href+'">'+esc(text)+ic('arrow',15)+'</a>';
const empty=text=>'<div class="empty">'+esc(text)+'</div>';
const table=(cols,rows,none='Записей пока нет.')=>rows.length?'<div class="scroll"><table><thead><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty(none);
const heading=(title,sub='',action='')=>'<div class="heading"><div><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+action+'</div>';
const panel=(title,body,extra='')=>'<section class="panel"><div class="panelhead"><h2>'+title+'</h2>'+extra+'</div>'+body+'</section>';
const opt=(v,n,selected)=>'<option value="'+esc(v)+'"'+(String(v)===String(selected)?' selected':'')+'>'+esc(n)+'</option>';
const options=(rows,selected)=>rows.map(x=>opt(x.id,x.name,selected)).join('');
let state,filters={},pageNo=1;
async function refresh(){
 const r=await fetch('/api/state',{cache:'no-store'});if(r.status===401){location.replace('/auth.html');return;}if(!r.ok)throw Error('Не удалось загрузить данные.');
 state=await r.json();
 $('#account-name').textContent=state.account.name;
 $('#account-avatar').textContent=initials(state.account.name);
 render();
}
function home(){
 const y=Number(state.today.slice(0,4))-(Number(state.today.slice(5,7))<9?1:0);
 const metric=(label,value,i,cls,href)=>'<a class="metric" href="#'+href+'"><div><small>'+label+'</small><strong>'+value+'</strong></div><span class="metricIcon '+cls+'">'+ic(i,22)+'</span></a>';
 const rows=active().slice(0,4).map(c=>[courseLink(c),c.headcount,subs(c.id).length,score(c.average)]);
 const recent=state.grades.slice(0,4).map(g=>'<a class="recent" href="#student/'+g.student_id+'">'+avatar(person(g.student_id))+'<span><b>'+esc(person(g.student_id).name.split(' ').slice(0,2).join(' '))+'</b><small>'+esc(subject(g.subject_id).name)+'</small></span>'+score(g.value)+'</a>').join('');
 return heading('Обзор колледжа','Курсы, ученики и успеваемость',btn('Добавить ученика','student'))+
 '<section class="hero"><div class="hero-copy"><span class="period"><i></i> Текущий период</span><h2>Учебный год <strong>'+y+' <em>/</em> '+(y+1)+'</strong></h2><a href="#courses">Перейти к курсам '+ic('arrow',16)+'</a></div><img src="/campus.png" alt="" class="campus"></section>'+
 '<div class="metrics">'+metric('Всего учеников',state.students.length,'users','sage','students')+metric('Активные курсы',active().length,'book','apricot','courses')+metric('Средний балл¹',num(state.average),'trend','lilac','reports')+'</div>'+
 '<div class="overview-grid">'+panel('Активные курсы',table(['Курс','Ученики','Предметы','Балл'],rows,'Активных курсов пока нет.'),link('Все курсы','courses'))+panel('Последние оценки',recent||empty('Оценок пока нет.'),link('Журнал','journal'))+'</div><p class="footnote">¹ По всем оценкам на активных курсах.</p>';
}
function search(val=''){return '<label class="search">'+ic('search',17)+'<input id="search" type="search" placeholder="Поиск по ФИО" aria-label="Поиск по ФИО" value="'+esc(val)+'"></label>';}
function selector(id,label,opts){return '<label class="filter"><span>'+label+'</span><select data-filter="'+id+'">'+opts+'</select></label>';}
function students(){
 const rows=state.students.filter(s=>s.name.toLowerCase().includes((filters.q||'').trim().toLowerCase())&&(!filters.year||s.year===Number(filters.year))).map(s=>[studentLink(s),s.year,esc(s.email||s.phone),state.enrollments.filter(e=>e.student_id===s.id&&!course(e.course_id).ended_on).length]);
 return heading('Ученики','Карточки и зачисления',btn('Добавить ученика','student'))+'<section class="panel"><div class="toolbar">'+search(filters.q)+selector('year','Курс обучения',opt('','Все',filters.year)+[1,2,3,4,5,6].map(i=>opt(i,i,filters.year)).join(''))+'</div>'+table(['ФИО','Курс обучения','Контакт','Активные зачисления'],rows,'Ученики не найдены.')+'</section>';
}
function courses(archive){
 const list=state.courses.filter(c=>Boolean(c.ended_on)===archive);
 return heading(archive?'Архив курсов':'Курсы',archive?'Завершённые курсы и результаты обучения':'Учебные программы и состав групп',archive?'':btn('Добавить курс','course'))+
 '<div class="cards">'+list.map(c=>'<a class="course-card" href="#course/'+c.id+'"><div class="spread">'+tile(c)+'<small class="status">'+(archive?'В архиве':'Активен')+'</small></div><h2>'+esc(c.name)+'</h2><p>'+ic('calendar',15)+' '+fmt(c.started_on)+(archive?' — '+fmt(c.ended_on):'')+'</p><footer><span>'+ic('users',15)+' Ученики <b>'+c.headcount+'</b></span><span>'+ic('book',15)+' Предметы <b>'+subs(c.id).length+'</b></span>'+ic('right',16)+'</footer></a>').join('')+'</div>'+(list.length?'':empty('Курсов пока нет.'));
}
function courseDetail(c){
 const group=members(c.id),items=subs(c.id),actions=c.ended_on?'':btn('Зачислить ученика','enroll','plus','primary',c.id);
 return linkBack(c.ended_on?'archive':'courses',c.ended_on?'Архив курсов':'Курсы')+
 heading(c.name,c.ended_on?'В архиве с '+fmt(c.ended_on):'Начало курса · '+fmt(c.started_on),actions)+
 '<div class="details-grid">'+panel('Ученики курса',table(['Ученик','Оценок','Средний балл'],group.map(s=>{const r=state.byStudent.find(v=>v.course_id===c.id&&v.student_id===s.id);return [studentLink(s),r.total,score(r.average)];}),'На курс ещё никто не зачислен.'))+
 panel('Предметы',items.map(s=>'<div class="lineitem"><span class="tile sage">'+ic('book',17)+'</span><span><b>'+esc(s.name)+'</b><small>'+esc(s.teacher||'Преподаватель не указан')+'</small></span></div>').join('')||empty('Добавьте первый предмет.'),c.ended_on?'':btn('Добавить','subject','plus','subtle',c.id))+'</div>'+
 '<div class="bottom-actions"><span>Средний балл курса <b>'+num(c.average)+'</b></span>'+(c.ended_on?'':btn('В архив','archive','archive','secondary',c.id))+'</div>';
}
const linkBack=(dest,label)=>'<a class="back" href="#'+dest+'">'+ic('back',15)+esc(label)+'</a>';
function studentDetail(s){
 const groups=state.enrollments.filter(e=>e.student_id===s.id).map(e=>course(e.course_id));
 const details=[['Дата рождения',fmt(s.birthday)],['Пол',s.gender],['Курс обучения',s.year],['Почта',s.email||'—'],['Телефон',s.phone||'—']];
 return linkBack('students','Ученики')+heading(s.name,'Карточка ученика',btn('Удалить ученика','delete','trash','secondary',s.id))+
 panel('Личные данные','<dl>'+details.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>')+
 panel('Курсы и средние оценки',groups.map(c=>'<div class="subheading">'+courseLink(c)+(c.ended_on?'<small>В архиве</small>':'')+'</div>'+subjectTable(s.id,c.id)).join('')||empty('Ученик пока не зачислен ни на один курс.'));
}
function subjectTable(sid,cid){return table(['Предмет','Оценок','Средний балл'],state.bySubject.filter(x=>x.student_id===sid&&x.course_id===cid).map(r=>[esc(subject(r.subject_id).name),r.total,score(r.average)]),'Предметы ещё не заданы.');}
function journal(){
 const list=state.grades.filter(g=>(!filters.cid||g.course_id===Number(filters.cid))&&(!filters.q||person(g.student_id).name.toLowerCase().includes(filters.q.trim().toLowerCase())));
 const pages=Math.max(1,Math.ceil(list.length/15));pageNo=Math.min(pageNo,pages);
 return heading('Журнал оценок','Оценки по ученикам, курсам и предметам',btn('Поставить оценку','grade'))+'<section class="panel"><div class="toolbar">'+search(filters.q)+selector('cid','Курс',opt('','Все курсы',filters.cid)+options(state.courses,filters.cid))+'</div>'+
 table(['Дата','Ученик','Курс','Предмет','Оценка'],list.slice((pageNo-1)*15,pageNo*15).map(g=>[fmt(g.graded_on),studentLink(person(g.student_id)),esc(course(g.course_id).name),esc(subject(g.subject_id).name),score(g.value)]))+
 '<div class="pager"><span>Записей: '+list.length+'</span><button data-act="prev" '+(pageNo<=1?'disabled':'')+'>Назад</button><b>'+pageNo+' / '+pages+'</b><button data-act="next" '+(pageNo>=pages?'disabled':'')+'>Далее</button></div></section>';
}
function reports(){
 const mode=filters.mode||'course',c=course(filters.cid)||active()[0]||state.courses[0],s=person(filters.sid)||state.students[0];
 let body='';
 if(mode==='course'&&c)body=selector('cid','Курс',options(state.courses,c.id))+table(['Ученик','Количество оценок','Средний балл'],state.byStudent.filter(r=>r.course_id===c.id).map(r=>[studentLink(person(r.student_id)),r.total,score(r.average)]),'На курсе пока нет учеников.')+'<div class="summary">Средний балл по всем оценкам курса <b>'+num(c.average)+'</b></div>';
 if(mode==='student'&&s)body=selector('sid','Ученик',options(state.students,s.id))+table(['Курс','Предмет','Количество оценок','Средний балл'],state.bySubject.filter(r=>r.student_id===s.id).map(r=>[esc(course(r.course_id).name),esc(subject(r.subject_id).name),r.total,score(r.average)]),'У ученика пока нет назначенных предметов.');
 return heading('Успеваемость','Средние баллы по курсам и предметам')+'<div class="switch">'+['course','student'].map(m=>'<button data-act="mode" data-id="'+m+'" class="'+(mode===m?'chosen':'')+'">'+(m==='course'?'По курсу':'По ученику')+'</button>').join('')+'</div><section class="panel report">'+(body||empty('Нет данных для отчёта.'))+'</section><p class="footnote">Средний балл рассчитывается по выставленным оценкам. Прочерк означает, что оценок ещё нет.</p>';
}
function render(){
 let [key='home',id]=hash();key=key||'home';
 let section=key==='course'?(course(id)?.ended_on?'archive':'courses'):key==='student'?'students':key;
 let entry=nav.find(n=>n[0]===section);
 $('#nav').innerHTML=nav.map(([k,n,i])=>'<a href="#'+k+'" '+(k===section?'aria-current="page"':'')+'>'+ic(i)+n+'</a>').join('');
 const pages={home,students,courses:()=>courses(false),archive:()=>courses(true),journal,reports,course:()=>course(id)&&courseDetail(course(id)),student:()=>person(id)&&studentDetail(person(id))};
 $('#content').innerHTML=(Object.hasOwn(pages,key)&&pages[key]())||heading('Страница не найдена')+linkBack('home','На главную');
 $('#crumb').textContent=entry?.[1]||'Обзор';document.title=($('#content h1')?.textContent||'Обзор')+' · ИТ Платформа';
 $('#topdate').innerHTML=ic('calendar',16)+fmt(state.today,{day:'numeric',month:'long',year:'numeric'});
}
const inp=(name,type,attrs='')=>'<input name="'+name+'" type="'+type+'" '+attrs+'>';
const sel=(name,opts)=>'<select name="'+name+'" required>'+opts+'</select>';
const label=(title,control)=>'<label class="field"><span>'+title+'</span>'+control+'</label>';
const row=(...fields)=>'<div class="formrow">'+fields.join('')+'</div>';
let formRoute='',successText='';
function openForm(act,id){
 let title='',body='',submit='Сохранить',route='',msg='',hidden='',danger=false;
 const c=course(id),s=person(id),today=state.today;
 switch(act){
 case 'student':
  title='Новый ученик';route='students';msg='Карточка ученика создана';submit='Добавить ученика';
  body=label('ФИО',inp('name','text','required maxlength="120" placeholder="Фамилия Имя Отчество"'))+
   row(label('Дата рождения',inp('birthday','date','required min="1900-01-01" max="'+today+'"')),label('Пол',sel('gender',opt('Не указан','Не указан')+opt('Мужской','Мужской')+opt('Женский','Женский'))))+
   '<p class="formhint">Укажите хотя бы один способ связи.</p>'+row(label('Почта',inp('email','email','maxlength="160" placeholder="name@example.org"')),label('Телефон',inp('phone','tel','maxlength="32" placeholder="+7 …"')))+
   label('Курс обучения',sel('year',[1,2,3,4,5,6].map(i=>opt(i,i+' курс')).join('')))+label('Зачислить на программу','<select name="course_id">'+opt('','Выбрать позже')+options(active())+'</select>');break;
 case 'course':
  title='Новый курс';route='courses';msg='Курс создан';submit='Создать курс';
  body=label('Название курса',inp('name','text','required maxlength="120" placeholder="Например, веб-разработка"'))+label('Дата начала',inp('started_on','date','required min="1900-01-01" max="'+today+'" value="'+today+'"'));break;
 case 'enroll':{
  const avail=state.students.filter(s=>!members(c.id).some(m=>m.id===s.id));
  title='Зачисление на курс';route=avail.length?'enroll':'';msg='Ученик зачислен';submit='Зачислить';
  body='<p class="formhint">'+esc(c.name)+'</p>'+(avail.length?label('Ученик',sel('student_id',options(avail))):empty('Нет доступных учеников. Добавьте ученика в разделе «Ученики».'));hidden=c.id;break;}
 case 'subject':
  title='Новый предмет';route='subjects';msg='Предмет добавлен';submit='Добавить предмет';hidden=c.id;
  body='<p class="formhint">'+esc(c.name)+'</p>'+label('Название предмета',inp('name','text','required maxlength="120"'))+label('Преподаватель · необязательно',inp('teacher','text','maxlength="120"'));break;
 case 'grade':{
  title='Новая оценка';const avail=active().filter(c=>members(c.id).length&&subs(c.id).length);
  route=avail.length?'grades':'';msg='Оценка выставлена';submit='Поставить оценку';
  body=avail.length?label('Курс',sel('course_id',options(avail)))+'<div id="gradefields"></div>'+row(label('Оценка',sel('value',[5,4,3,2].map(v=>opt(v,v)).join(''))),label('Дата',inp('graded_on','date','required max="'+today+'" value="'+today+'"'))):empty('Для выставления оценки добавьте предмет и зачислите ученика на активный курс.');break;}
 case 'archive':
  title='Перенести курс в архив?';route='archive';msg='Курс в архиве';submit='В архив';hidden=c.id;
  body='<p class="formhint">Курс «'+esc(c.name)+'», список учеников и оценки останутся доступны для просмотра.</p>'+label('Дата окончания',inp('ended_on','date','required min="'+c.started_on+'" max="'+today+'" value="'+today+'"'));break;
 case 'delete':
  title='Удалить ученика?';route='delete-student';msg='Ученик удалён';submit='Удалить ученика';danger=true;
  body='<p class="formhint">Карточка ученика «'+esc(s.name)+'», все его зачисления и оценки будут удалены. Отменить это действие нельзя.</p><input type="hidden" name="student_id" value="'+s.id+'">';break;
 default:return;
 }
 formRoute=route;successText=msg;
 $('#modal').innerHTML='<form id="editform"><div class="modalhead"><h2>'+title+'</h2><button type="button" class="iconbtn" data-act="close" aria-label="Закрыть">'+ic('close')+'</button></div>'+body+(hidden?'<input name="course_id" type="hidden" value="'+hidden+'">':'')+'<p id="formerror" role="alert"></p><div class="formactions"><button class="button secondary" type="button" data-act="close">'+(route?'Отмена':'Закрыть')+'</button>'+(route?'<button class="button '+(danger?'danger':'primary')+'" type="submit">'+submit+'</button>':'')+'</div></form>';
 if(act==='grade'&&route)gradeFields();$('#dialog').showModal();
}
function gradeFields(){
 const cid=Number($('#editform [name=course_id]').value);
 $('#gradefields').innerHTML=label('Ученик',sel('student_id',options(members(cid))))+label('Предмет',sel('subject_id',options(subs(cid))));
 $('#editform [name=graded_on]').min=course(cid).started_on;
}
let toastTimer;
function notify(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function menu(open){document.body.classList.toggle('nav-open',open);$('#shade').hidden=!open;$('.menu').setAttribute('aria-expanded',String(open));}
document.addEventListener('click',e=>{
 if(e.target.closest('.skip')){e.preventDefault();$('#content').focus();return;}
 if(e.target.closest('.menu'))return menu(true);
 if(e.target.closest('#shade')||e.target.closest('nav a'))menu(false);
 const a=e.target.closest('[data-act]');if(!a)return;
 const act=a.dataset.act;
 if(act==='close')return $('#dialog').close();
 if(act==='prev'||act==='next'){pageNo+=act==='next'?1:-1;render();return;}
 if(act==='mode'){filters.mode=a.dataset.id;render();return;}
 openForm(act,Number(a.dataset.id));
});
document.addEventListener('change',e=>{
 if(e.target.dataset.filter){filters[e.target.dataset.filter]=e.target.value;pageNo=1;render();}
 if(e.target.matches('#editform [name=course_id]')&&formRoute==='grades')gradeFields();
});
document.addEventListener('input',e=>{
 if(e.target.id==='search'){const pos=e.target.selectionStart;filters.q=e.target.value;pageNo=1;render();$('#search').focus();$('#search').setSelectionRange(pos,pos);}
});
document.addEventListener('submit',async e=>{
 if(e.target.id!=='editform')return;e.preventDefault();
 const form=e.target,submit=form.querySelector('[type=submit]'),route=formRoute;
 if(submit.disabled)return;submit.disabled=true;
 try{
  const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
  if(r.status===401){location.replace('/auth.html');return;}
  const result=await r.json();if(!r.ok)throw Error(result.error);
  $('#dialog').close();
  await refresh();
  if(route==='delete-student')location.hash='students';
  if(route==='courses')location.hash='course/'+result.id;
  if(route==='students')location.hash='student/'+result.id;
  if(route==='archive')location.hash='archive';
  notify(successText);
 }catch(err){if($('#dialog').open)$('#formerror').textContent=err.message;else notify('Обновите страницу для загрузки данных.');}
 finally{submit.disabled=false;}
});
window.addEventListener('hashchange',()=>{filters={};pageNo=1;menu(false);if($('#dialog').open)$('#dialog').close();if(state)render();window.scrollTo(0,0);});
refresh().catch(()=>{$('#content').innerHTML=empty('Не удалось загрузить данные. Проверьте, что сервер запущен, и обновите страницу.');});

$('#sign-out').addEventListener('click',async e=>{
 const button=e.currentTarget;
 button.disabled=true;
 try{
  const r=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!r.ok)throw Error();
  location.replace('/auth.html');
 }catch{notify('Не удалось выйти. Попробуйте ещё раз.');button.disabled=false;}
});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
