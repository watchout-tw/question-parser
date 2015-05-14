import fs from "fs";
import path from "path";
import parse from "csv-parse";
import xml from "xml";

// var not_name = /案由|禽流感|牛肉|結構|方案|所以|第[一二三四五六七八九]案|我們|這部分|捷運|在.+方面|說明|決\s*定|命題|機制|目前|決議|請問|協商|報告|質疑|爭議|重點|修正|產業|（註|情形|行為|開發|經費|科專|收入|決算|部分|計畫|服務|食品安全|專案|備註|臺東站|站.+站|變電站|資料來源|網站|最新統計|印尼外交部|用途|機場|規劃|在場人員|增列|基金|主管機關|依據|結果|進行|事項|第\s*[一二三四五六七八九]\s*條|建議|美國|包括|原因|在案|會議|父母|問題|發布|更正|附註|現在|訴求|醫療|公債|推動|擴大|由來|勞工|要求|地區|例如|費用|此乃因|新聞|出席|記得|主題|第[一二三四五六七八九]個/;
var not_name = new RegExp((require('./ignore')).toString().replace(/,/g,'|'));
var rs = fs.createReadStream(path.resolve(__dirname + '/complete.csv'));

function paddZero(x) {
  return String("0" + x).slice(-2);
}
function timeFormat({year, month, day, hour, min, sec}:time) {
  return `${year}-${month}-${day}T${paddZero(hour)}:${paddZero(min)}:${paddZero(sec)}`;
}
var parser = parse({colums: true, trime: true}, (err, data) => {
  data
    // .filter((row, i ) => { if(i === 17 ) return true; })
    .map((row, i)=> {
    var file = row.shift();
    // if(file === 'LCIDC01_1015401_00004.md') console.log(i);
    var start = parseInt(row.shift(), 10);
    var end = parseInt(row.shift(), 10);
    var content = fs.readFileSync(`./md/${file}`, 'utf8');
    var speaker = '', speech = [], questioner, officials = [], official = null, chairman, temp_chairman, heading, committee, time;
    var Sections = [], debateSection = [], speakers = [], References = [], Preface = [];

    content.split('\n').map((line, index, self)=> {
      var line_no = index + 1, tmp;
      if( line_no < start  && (tmp = line.match(/立法院第(\d+)屆第(\d+)會期(\W+)委員會第(\d+)次全體委員(會)?會議紀錄/))) {
        committee = tmp[3];
        heading = line;
      }
      if( line_no < start && (tmp = line.match(/時　　間　.*(\d{3})年(\d+)月(\d+)(日)?（\W+）((\W{1})午)?(\d+)時/))) {
        time = {
          year: parseInt(tmp[1]) + 1911,
          month: paddZero(~~tmp[2]),
          day: paddZero(~~tmp[3]),
          hour: (tmp[4] === '上')? ~~tmp[5] : ~~tmp[5] + 12,
          min: 0,
          sec: 0,
        };
        var code = file.match(/LCIDC01_(\d{3})(\d{2})\d+_\d+/);
        Preface = [{
          docDate: { _attr: { date: `${time.year}-${time.month}-${time.day}` }}}, {
          docTitle: `${time.year}年${time.month}月${time.day}日, ${committee}`}, {
          link: { _attr: { href: `http://lci.ly.gov.tw/LyLCEW/jsp/ldad000.jsp?irKey=&htmlType=communique&fileName=/communique1/final/html/${code[1]}/${code[2]}/${file.replace('md','htm')}`}}
        }];
        // heading =`${time.year}年${time.month}月${time.day}日, ${committee}`;
        // Sections = [{heading }];
      }
      if(line_no < start && !chairman && (tmp = line.match(/(?:主　　席|主 持 人)　(\W+)/)) && !line.match(/出席委員已足法定人數/)) {
        chairman = tmp[1];
      }

      if(speaker !== '' && line !== '') speech.push({p: line.replace(`${speaker}：`,"").trim()});

      if((tmp = line.match(/(^[^：()1-9※■A-Za-z，、◆─․\-「－●★˙Ｑ]{2,17})：(.+[。？！\.：]$)/))) {
        if(!tmp[1].match(not_name)) {
          speaker = tmp[1].trim();
          speech = [ { p: tmp[2].trim() }];
        } else {
          speech.push({ p: tmp[2].trim()});
        }
      }

      if(line_no >= start && line_no <= end) {
        // 處理代理主席
        var re = new RegExp(`主席（${chairman}）`);
        if(speaker.match(/主席（(\W+)代）/)) {
          temp_chairman = speaker.match(/主席（(\W+)代）/)[1];
        } else if (re.exec(speaker)) {
          temp_chairman = null;
        }

        if(line !== '' && index <= self.length -3 && self[index+2].match(/(^[^：()1-9※■A-Za-z，、◆─․\-「－●★˙Ｑ]{2,17})：(.+[。？！\.：]$)/)) {
          // 處理主任委員的名稱
          if(speaker.match(/^黃主任委員$/)) speaker = '黃主任委員玉振';
          speaker = speaker.replace(/主任委(員)?/, '主委');

          if(!speaker.match(/主席/) && !speaker.match(/^.{1}(?!主任)委員/)) {
            official = speaker;
          }

          if(official && officials.indexOf(official) === -1) officials.push(official);

          // 質詢人交換
          if(speaker.match(/主席/) && (tmp = line.match(/請(?!兩位).*(.{1}委員(?!(的|可以|會是|登記|非常|不要|，因)).+)(質詢|發言)(。|，)/))) {
              if(debateSection.length > 1 && questioner) {
                Sections.push({
                  debateSection: [{heading: `${Sections.length + 1}.${questioner.replace('委員','')}質詢${officials.toString()}`}]
                  .concat(debateSection) });
              }
              questioner = tmp[1];
              official = null;
              debateSection = [];
              officials = [];
          }

          // time.sec += 15;
          // if(time.sec >= 60 ) {
          //   time.sec -= 60;
          //   time.min += 1;
          // }
          // if(time.min >= 60 ) {
          //   time.min -= 60;
          //   time.hour += 1;
          // }

          speaker = speaker.replace("主席", (temp_chairman || chairman )).replace(/（.+）/,"");

          debateSection.push({
            speech: [{_attr: {
              by: `#${speaker}`,
              // startTime: timeFormat(time)
              } }].concat(speech)
          });

          if(speakers.indexOf(speaker) < 0) {
            speakers.push(speaker);
            References.push({
              TLCPerson: {
                _attr: {
                  href: `/ontology/person/sayit.musou.tw/${speaker}`,
                  id: speaker,
                  showAs: speaker
                }
              }
            });
          }
        }

        if(line_no === end && debateSection.length > 1 && questioner) {
          Sections.push({
            debateSection: [{heading: `${Sections.length+1}.${questioner.replace('委員','')}質詢${officials.toString()}`}]
            .concat(debateSection) });
        }
        if(line_no === end && row.length > 0) {
          start = parseInt(row.shift(), 10);
          end = parseInt(row.shift(), 10);
        }
      }
    }); // content end
    var an = {akomaNtoso: [{ debate: [
      {meta: [{references: References}]},
      {preface: Preface},
      {debateBody: Sections }
    ]}]};
    // console.log(JSON.stringify(an));
    // console.log(xml(an));
    fs.writeFileSync(`./xml/${file.replace('md','xml')}`, xml(an));
  }); // data end

}); // parse end

rs.pipe(parser);

