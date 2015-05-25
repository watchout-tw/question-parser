import fs from "fs";
import path from "path";
import parse from "csv-parse";
import xml from "xml";
import {correctName, paddZero, parseMeta} from './lib/utils.es6'

var not_name = new RegExp((require('./ignore')).toString().replace(/,/g,'|'));
var position = new RegExp((require('./position')).toString().replace(/,/g,'|'));
var persons = JSON.parse(fs.readFileSync('./popit.json').toString());
var rs = fs.createReadStream(path.resolve(__dirname + '/complete.csv'));

var parser = parse({colums: true, trime: true}, (err, data) => {
  var meta = {};
  data
    // .filter((row, i ) => { if(i < 520 && i >= 517 ) return true; })
    .map((row, i)=> {
    var file = row.shift();
    var start = parseInt(row.shift(), 10);
    var end = parseInt(row.shift(), 10);
    var content = fs.readFileSync(`./md/${file}`, 'utf8');

    if(isNaN(start)) {
      let tmp_meta = parseMeta(content);
      Object.keys(tmp_meta).map((key)=> {
        meta[key] = tmp_meta[key];
      });
      return;
    }
    var speaker = '', speech = [], questioner, officials = [], official = null, chairman, temp_chairman, heading, committee, time;
    var Sections = [], debateSection = [], speakers = [], References = [], Preface = [];
    var imageHits = 0;

    content.split('\n').map((line, index, self)=> {
      var line_no = index + 1, tmp;
      if(line.match(/image/)) imageHits += 1;

      if( line_no < start  && (tmp = line.match(/立法院第(\d+)屆(?:第)?(\d+)會期(?:第.+會)?(\W+)委員會第(\d+)次(?:全體委員|聯席)(?:會)?會議(?:紀錄)?/))) {
        committee = tmp[3];
        heading = line;
        meta["committee"] = committee;
      }

      if( line_no < start && imageHits === 0 && (tmp = line.match(/(?:(?:開會)?時\s*間|繼續開會).*(\d{3})年(\d+)月(\d+)\s*(日)?[（(]\W+[）)]((\W{1})午)?(\d+)\s*時/))) {
        time = {
          year: parseInt(tmp[1]) + 1911,
          month: paddZero(~~tmp[2]),
          day: paddZero(~~tmp[3]),
          hour: (tmp[4] === '上')? ~~tmp[5] : ~~tmp[5] + 12,
          min: 0,
          sec: 0,
        };
      }

      // 沒有年份
      if( line_no < start && imageHits === 0 && !time && (tmp = line.match(/(?:時\s*間).*(\d+)月(\d+)\s*(日)?[（(]\W+[）)]((\W{1})午)?(\d+)\s*時/))) {
        let code = file.match(/LCIDC01_(\d{3})(\d{2})\d+_\d+/);
        time = {
          year: parseInt(code[1], 10) + 1911,
          month: paddZero(~~tmp[1]),
          day: paddZero(~~tmp[2]),
          hour: (tmp[3] === '上')? ~~tmp[4] : ~~tmp[4] + 12,
          min: 0,
          sec: 0,
        };
      }

      if(line_no < start && heading && !chairman && (tmp = line.match(/(?:主\s*席|主 持 人)(?:\s+|：)(\W+)/)) && !line.match(/出席委員已足法定人數/)) {
        chairman = tmp[1];
        meta["chairman"] = chairman;
      }

      if(line_no === start && !heading) {
        chairman = meta.chairman;
        committee = meta.committee;
        if(!time) time = meta.time;
      }
      // Check point
      // if(line_no === start && !time) console.log(file);
      if(line_no === start && Preface.length === 0) {
        var code = file.match(/LCIDC01_(\d{3})(\d{2})\d+_\d+/);
        Preface = [{
          docDate: { _attr: { date: `${time.year}-${time.month}-${time.day}` }}}, {
          docTitle: `${time.year}年${time.month}月${time.day}日, ${committee}`}, {
          link: { _attr: { href: `http://lci.ly.gov.tw/LyLCEW/jsp/ldad000.jsp?irKey=&htmlType=communique&fileName=/communique1/final/html/${code[1]}/${code[2]}/${file.replace('md','htm')}`}}
        }];
        // First check point
        console.log(file, Preface[0].docDate._attr.date, Preface[1].docTitle);
      }

      if(speaker !== '' && line !== '') speech.push({p: line.replace(`${speaker}：`,"").trim()});

      if((tmp = line.match(/(^[^：()1-9※■A-Za-z，、◆─․\-「－●★˙Ｑ☆→]{2,17})：(.+[。？！\.：]$)/))) {
        if(!tmp[1].match(not_name)) {
          speaker = tmp[1].trim().replace('繼續開會','');
          speech = [ { p: tmp[2].trim() }];
        } else {
          speech.push({ p: tmp[2].trim()});
        }
      }

      if(line_no >= start && line_no <= end && line !== '') {
        // 處理代理主席
        var re = new RegExp(`主席（${chairman}）`);
        if(speaker.match(/主席（(\W+)代）|主席〈(\W+)〉/)) {
          temp_chairman = speaker.match(/主席（(\W+)代）|主席〈(\W+)〉/)[1];

        } else if (re.exec(speaker)) {
          temp_chairman = null;
        }
        if(line !== '' && index <= self.length -3 && self[index+2].match(/(^[^：()1-9※■A-Za-z，、◆─․\-「－●★˙Ｑ]{2,17})：(.+[。？！\.：]$)/)) {
          // 處理主任委員或奇奇怪怪的名稱
          speaker = correctName(speaker);

          if(!speaker.match(/主席/) && !speaker.match(/^.{1}(?!主任)委員(?!長)/)) {
            official = speaker.replace(position, '');
          }

          if(official && officials.indexOf(official) === -1) officials.push(official);

          // 質詢人交換
          if(speaker.match(/主席/) && (tmp = line.match(/請(?!兩位).*(.{1}委員(?!的|可以|會是|登記|非常|不要|，因|要|開始|在|繼續).{1,3})(質詢|發言)(。|，)/))) {
              if(debateSection.length > 1 && questioner) {
                let word = (officials.length === 0)? '發言':'質詢';
                Sections.push({
                  debateSection: [{heading: `${Sections.length + 1}.${questioner.replace('委員','')}${word}${officials.toString()}`}]
                  .concat(debateSection) });
              }
              questioner = tmp[1];
              official = null;
              debateSection = [];
              officials = [];
          }

          speaker = speaker.replace("主席", (temp_chairman || chairman )).replace(/（.+）|〈.+〉/,"");
          let speaker_name = speaker.replace(position, '');
          // Second check point
          // console.log(speaker_name);
          debateSection.push({
            speech: [{_attr: {
              by: `#${speaker_name}`,
              // startTime: timeFormat(time)
              } }].concat(speech)
          });
          var href = speaker_name;
          if(persons[speaker_name]) href = persons[speaker_name].id;
          if(speakers.indexOf(speaker_name) < 0) {
            speakers.push(speaker_name);
            References.push({
              TLCPerson: {
                _attr: {
                  href: `${href}`,//`/ontology/person/sayit.musou.tw/${speaker_name}`,
                  id: speaker_name,
                  showAs: speaker_name
                }
              }
            });
          }
        }

        if(line_no === end && debateSection.length > 1 && questioner) {
          let word = (officials.length === 0)? '發言':'質詢';
          Sections.push({
            debateSection: [{heading: `${Sections.length+1}.${questioner.replace('委員','')}${word}${officials.toString()}`}]
            .concat(debateSection) });
        }

        if(line_no === end && row.length > 0) {
          start = parseInt(row.shift(), 10);
          end = parseInt(row.shift(), 10);
        }

      } // 指定內容 end


      if( line_no > end && (tmp = line.match(/(?:時　　間|繼續開會).*(\d{3})年(\d+)月(\d+)\s*(日)?（\W+）((\W{1})午)?(\d+)\s*時/))) {
        time = {
          year: parseInt(tmp[1]) + 1911,
          month: paddZero(~~tmp[2]),
          day: paddZero(~~tmp[3]),
          hour: (tmp[4] === '上')? ~~tmp[5] : ~~tmp[5] + 12,
          min: 0,
          sec: 0,
        };
        meta["time"] = time;
      }

    }); // content end
    var an = {akomaNtoso: [{ debate: [
      {meta: [{references: References}]},
      {preface: Preface},
      {debateBody: Sections }
    ]}]};
    fs.writeFileSync(`./xml/${file.replace('md','xml')}`, xml(an));
  }); // data end

}); // parse end

rs.pipe(parser);

