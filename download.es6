import fs from "fs";
import parse from "csv-parse";
import request from "request";
import async from "async";
import {argv} from "yargs";
import path from "path";

var {file, verbose} = argv

var rs = fs.createReadStream(path.resolve(__dirname + `/${file}`));

if(!fs.existsSync(__dirname +'/htm')) fs.mkdirSync(__dirname + '/htm');

if(!file) {
  console.log('Please use --file');
  process.exit();
}

var parser = parse({colums: true, trime: true}, (err, data) => {
  var links = [], titles = [];
  var list = data
  .filter((it) => {
    if(~~it[8] === 3 && !it[10].match(/公聽會|選舉本院副?院長|召集委員/)) return true;
    return false; })
  .map((it)=> {
    links.push(it[14]);
    return it[10]; })
  links = links.filter(function(item, pos, self) {
    // 過濾重複 entry
    if(self.indexOf(item) == pos) titles.push(list[pos]);
    return self.indexOf(item) == pos;
  });

  if(verbose) titles.map((title, i)=> { console.log(`${title}, ${links[i]}`); });

  console.log(links.length);
  if(!verbose) {
    async.eachSeries(links, (link, next)=> {
      var file_name = link.split('/')[11];
      var req = request.get(link);
      var output = fs.createWriteStream(path.resolve(__dirname + `/htm/${file_name}`));
      req.on('data', (it) => {output.write(it); });
      req.on('end', ()=>{ next(); });
    });
  }

});


rs.pipe(parser);

// var content = fs.readFileSync(__dirname +"/1.csv").toString();
// var pdfLink,htmlLink,seg;

// var links = content.split('\n').map((line) => {
//   return pdfLink = line.split(',')[2];

// });

// if(!fs.existsSync(__dirname +'/pdf')) fs.mkdirSync(__dirname + '/pdf');

// function getDWR() {
//   return new Promise((resolve, reject)=>{
//     request({
//       uri: 'http://lci.ly.gov.tw/LyLCEW/dwr/call/plaincall/__System.generateId.dwr',
//       method: 'POST',
//       form: {
//         callCount:1,
//         'c0-scriptName': '__System',
//         'c0-methodName': 'generateId',
//         'c0-id':0,
//         'batchId':0,
//         'instanceId':0,
//         page:'%2FLyLCEW%2FlcivCommQry.action',
//         scriptSessionId:'',
//         windowName:''
//       }
//     }, (err, res, body) => {
//       if(err) return reject(err);
//       return resolve(body.match(/r\.handleCallback\("0","0","(.+)"\);/)[1]);
//     });
//   });
// }

// getDWR().then((dwr) => {
//   request({
//     uri: 'http://lci.ly.gov.tw/LyLCEW/dwr/call/plaincall/SearchEngineDWR.queryCommfile.dwr',
//     method: 'POST',
//     form: {
//       callCount: 1,
//       windowName: '',
//       'c0-scriptName': 'Lci2tCommFileAttachDWR',
//       'c0-methodName': 'query',
//       'c0-id': 0,
//       'c0-param0': 'string:104',
//       'c0-param1': 'string:27',
//       'c0-param2': 'string:01',
//       'c0-param3': 'string:5',
//       'c0-param4':'null:null',
//       'c0-param5':'null:null',
//       'c0-param6':'null:null',
//       batchId: 3,
//       instanceId:0,
//       'page':'%2FLyLCEW%2FlcivCommQry.action',
//       'scriptSessionId': dwr//'3W1s2nmbZF9wrUmTi5o6EB660Qk/AAFH0Qk-t4R4Kb3kv'
//     }
//   },(err,res, body)=> {
//     var r = body.match(/r\.handleCallback\("\d","\d",(.+)\);/)[1];
//     var list = JSON.parse(r.replace(/attachFileSeqno/g, '"attachFileSeqno"')
//       .replace(/bookId/g,'"bookId"')
//       .replace(/fieldName/g,'"fieldName"')
//       .replace(/fieldSize/g,'"fieldSize"')
//       .replace(/fieldValue/g,'"fieldValue"')
//       .replace(/filePath/g,'"filePath"')
//       .replace(/fileSeqno/g,'"fileSeqno"')
//       .replace(/fileType/g,'"fileType"')
//       .replace(/volume/g,'"volume"')
//       .replace(/year/g,'"year"')
//       .replace(/\\\\/g,'/'));
//     var docs = list.filter((e)=> {
//       if(e.filePath.match(/htm$/)) return true;
//       return false;
//     });
//     async.eachSeries(docs, (doc, next) => {
//       var seg = doc.filePath.split('/');
//       var req = request.get('http://lci.ly.gov.tw/LyLCEW/' + doc.filePath);
//       var output = fs.createWriteStream(__dirname+`/htm/${seg[5]}`);
//       req.on('data', (it) => {output.write(it); });
//       req.on('end', ()=>{ next(); });
//     }, ()=> {
//       console.log('downloaded');
//     });
//   });
// });


// http://lci.ly.gov.tw/LyLCEW/communique1/work/104/27/LCIDC01_1042701_00006.doc


// async.eachSeries(links, (link, next)=>{
//   seg = link.split('/');
//   // htmlLink = "http://lci.ly.gov.tw/LyLCEW/jsp/ldad000.jsp?irKey=&htmlType=communique&fileName=/communique1/final/html/";
//   // htmlLink += `${seg[7]}/${seg[8]}/${seg[9].replace('pdf','htm')}`;
//   // request.get(htmlLink).pipe(fs.createWriteStream(__dirname +`/html/${seg[9].replace('pdf','htm')}`));
//   var req = request.get(link);
//   var output = fs.createWriteStream(__dirname+`/pdf/${seg[9]}`);
//   req.on('data', (it) => {output.write(it); });
//   req.on('end', ()=>{ next(); });
// }, () => {
//   console.log('All downloaded');
// });