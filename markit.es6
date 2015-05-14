import fs from "fs";
import path from "path";
import parse from "csv-parse";
import xml from "xml";
import redis from "redis";

// var client = redis.createClient(6379, '108.61.163.226');

// client.on('error',(it) => {console.log(it);});

function matchQuestionStart(string) { //(現在)?.*(開始)?(進行)?(詢答|質詢).+(發言)?(時間)?.+分鐘
  return string.match(/[^備辦法要委員的趕快](詢答|質詢)(?!的權利|會有|，應該|，(首先我|現在)|之前|方式|公開)/);
}

function matchQuestionEnd(string) {
  return string.match(/[^直到委員](發言|詢答|質詢|答詢|議程)(到此|均已)?(結束|完畢)(?!，(由於|中午|下午|我們|但是|剛剛|休息)|(之)?後|為止|再|前)|(擇期|另定期)(召開|舉行)會議繼續|^(發言|詢答|質詢|答詢)(結束|完畢)/);
}

function convertToAkomaNtoso (doc) {
  var speakers = [];
  var references = [];
  var debateSection = [{heading: doc["heading"]}];

  doc.conversations.map((conversation)=> {
    var Section = [{heading: `${conversation.questioner}質詢`}];
    conversation.phrases.map(({speaker, speech}:phrase)=> {
      if(speakers.indexOf(speaker) < 0) {
        speakers.push(speaker);
        references.push({
          TLCPerson: {
            _attr: {
              href: `/ontology/person/lytest.sayit.mysociety.org/${speaker}`,
              id: speaker,
              showAs: speaker
            }
          }
        });
      }
      Section.push({
        speech: [{
          _attr: { by: `#${speaker}` } }, {
          p: speech}]
      });
    });
    debateSection.push({
      debateSection: Section
    });
  });
  return ({akomaNtoso: [{ debate: [
      {meta: [{references: references}]},
      {debateBody: [{debateSection: debateSection}]}
    ]}]});
}

var not_name = /案由|禽流感|牛肉|結構|方案|所以|第[一二三四五六七八九]案|我們|這部分|捷運|在.+方面|說明|決\s*定|命題|機制|目前|決議|請問|協商|報告|質疑|爭議|重點|修正|產業|（註|情形|行為|開發|經費|科專|收入|決算|部分|計畫|服務|食品安全|專案|備註|臺東站|站.+站|變電站|資料來源|網站|最新統計|印尼外交部|用途|機場|規劃|在場人員|增列|基金|主管機關|依據|結果|進行|事項|第\s*[一二三四五六七八九]\s*條|建議|美國|包括|原因|在案|會議|父母|問題|發布|更正|附註|現在|訴求|醫療|公債|推動|擴大|由來|勞工|要求|地區|例如|費用|此乃因|新聞/;
var rs = fs.createReadStream(path.resolve(__dirname + '/question.csv'));

var parser = parse({colums: true, trime: true}, (err, data) => {
  var docs = data
    // .filter((row, index) => { if(index === 0 ) return true; else return false;})
    // .filter((row)=> { return row[1].split('/')[11].match(/LCIDC01_104/); })
    .map((row, i)=> {
    var file = row[1].split('/')[11].replace("htm","md");
    var content = fs.readFileSync(`./md/${file}`, "utf8");
    var record_ready, record_start, record_end, image_hits = 0;
    var speaker='', speech= '';
    var question_start, question_end, questions =[];
    var no_record;

    var header, time, chairman, temp_chairman, conversation, questioner, official;
    // var doc = { conversations:[] , meta: []}, dialog = {phrases: [], officials: []};;
    var doc = { meta: [] };
    content.split('\n').map((line, no, self) => {
      var speak;
      // 繼續開會
      if(no === 0 && line.match(/^繼續開會/)) { }

      if(line.match(/image/)) image_hits+=1;

      // 處理委員會資訊
      // TODO: 處理聯席
      if( image_hits ===  0 && (header = line.match(/立法院第(\d+)屆第(\d+)會期(\W+)委員會第(\d+)次全體委員會議紀錄/))) {
        // doc["heading"] = line;
        // doc["header"] = {
        //   ad: header[1],
        //   session: header[2],
        //   committee: header[3],
        //   sitting: header[4]
        // };
      }

      // 處理會議時間
      if(image_hits ===  0 && (time = line.match(/時　　間　中華民國(\d+)年(\d+)月(\d+)日（(\W+)）(\W+)午(\d+)時/))) {
        // doc["date"] = `${time[1]}-${time[2]}-${time[3]}`;
      }

      // 處理主席
      if(image_hits ===  0 && (chairman = line.match(/主　　席　(\W+)/)) && !line.match(/出席委員已足法定人數/)) {
        // doc["chairman"] = chairman[1]; //.replace('委員','');
      }
      if(!record_ready && line.match(/報　告　事　項/)) record_ready = true;
      if(image_hits === 0 && record_ready &&line.match(/宣讀.+會議議事錄/)) record_start = no + 1;
      if(image_hits === 2 && record_start && !record_end) record_end = no+ 1;

      if(speaker !== '' && line !== '') speech += line.replace(`${speaker}：`,"") + "\n";

      if((speak = line.match(/(^[^：()1-9※■A-Za-z，、◆─․\-「－●★˙Ｑ]{2,17})：(.+[。？！\.：]$)/))) {
        if(!speak[1].match(not_name)) {
          speaker = speak[1];
          speech = speak[2] + "\n";
        } else {
          speech += speak[2] + "\n";
        }
      }

      if(question_start && !question_end && speaker.match(/主席/) && matchQuestionEnd(line)) {
        question_end = no + 1;
      }

      if(question_start && !question_end && speaker.match(/主席/) && no <= self.length -3 && self[no+2].match(/^.{1}委員.{1,}書面(質詢|意見|補充資料)：/)) {
        question_end = no + 1;
      }

      if(!question_start && speaker.match(/主席/) && matchQuestionStart(line)) {

        question_start = no + 1;
      }

      if(question_end && line.match(/^(散會|休息)/) ) {
        questions = questions.concat([question_start, question_end]);
        question_start = question_end = undefined;
      }

      if(record_start && !record_end) {
        question_start = question_end = undefined;
      }

    });
    doc["raw"] = content;
    // console.log(xml(convertToAkomaNtoso(doc)));
    if(!record_start) {
      console.log(`${i}, ${file}, ${questions.toString()}`);
      fs.writeFileSync(`./remain/${file}`, content);
    }
    return doc;
  });
  // console.log(JSON.stringify(docs));
});


rs.pipe(parser);