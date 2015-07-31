
export var paddZero = (x) => {
  return String("0" + x).slice(-2);
};

export var timeFormat = ({year, month, day, hour, min, sec}:time) => {
  return `${year}-${month}-${day}T${paddZero(hour)}:${paddZero(min)}:${paddZero(sec)}`;
};

export var toUnicode = (theString) => {
  var unicodeString = '';
  for (var i=0; i < theString.length; i++) {
    var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
    while (theUnicode.length < 4) {
      theUnicode = '0' + theUnicode;
    }
    theUnicode = '\\u' + theUnicode;
    unicodeString += theUnicode;
  }
  return unicodeString;
};

export var parseMeta = (content) => {
  var meta = {};
  content.split('\n').map((line, index, self)=> {
    var line_no = index + 1, tmp;

    if(!meta.committee && (tmp = line.match(/立法院第(\d+)屆(?:第)?(\d+)會期(?:第.+會)?(\W+)委員會第(\d+)次全體委員(?:會)?會議(?:紀錄)?/))) {
      meta["committee"] = tmp[3];
    }

    if(!meta.time && (tmp = line.match(/(?:時　　間|繼續開會).*(\d{3})年(\d+)月(\d+)\s*(日)?（\W+）((\W{1})午)?(\d+)\s*時/))) {
      meta["time"] = {
        year: parseInt(tmp[1]) + 1911,
        month: paddZero(~~tmp[2]),
        day: paddZero(~~tmp[3]),
        hour: (tmp[4] === '上')? ~~tmp[5] : ~~tmp[5] + 12,
        min: 0,
        sec: 0,
      };
    }

    if(!meta.chairman && (tmp = line.match(/(?:主\s*席|主 持 人)(?:\s+|：)(\W+)/)) && !line.match(/出席委員已足法定人數/) && !self[0].match(/^繼續開會/)) {
      meta["chairman"] = tmp[1];
    }
  });
  return meta;
};

export var correctName = (speaker) => {
  if(speaker.match(/^王任委員政騰$/)) speaker = '王主任委員政騰';
  if(speaker.match(/^曾任委員銘宗$/)) speaker = '曾主任委員銘宗';
  if(speaker.match(/^黃主任委員$/)) speaker = '黃主任委員玉振';
  if(speaker.match(/^梁簡任技正馨$/)) speaker = '梁簡任技正溫馨';
  if(speaker.match(/^許代理署長$/)) speaker = '許代理署長銘能';
  if(speaker.match(/^部長家祝$/)) speaker = '張部長家祝';
  if(speaker.match(/^段委員康$/)) speaker = '段委員宜康';
  if(speaker.match(/^主委員美女$/)) speaker = '尤委員美女';
  if(speaker.match(/^王司長$/)) speaker = '王司長宗曦';
  if(speaker.match(/^高副主任委員見$/)) speaker = '高副主任委員長';
  if(speaker.match(/^金代表溥$/)) speaker = '金代表溥聰';
  if(speaker.match(/^彭總裁彭淮南$/)) speaker = '彭總裁淮南';
  if(speaker.match(/^蔣部長寧$/)) speaker = '蔣部長偉寧';
  if(speaker.match(/^羅部長瑩長$/)) speaker = '羅部長瑩雪';
  if(speaker.match(/^林委員淑芬委員$/)) speaker = '林委員淑芬';
  if(speaker.match(/^丁委員手中$/)) speaker = '丁委員守中';
  if(speaker.match(/^周委委員倪安$/)) speaker = '周委員倪安';
  if(speaker.match(/^羅偉委員明才$/)) speaker = '羅委員明才';
  if(speaker.match(/^丁參謀長武忠/)) speaker = '丁參謀長忠武';
  if(speaker.match(/\uE8DF/)) speaker = speaker.replace(/\uE8DF/,'敘');
  if(speaker.match(/\uE5CF/)) speaker = speaker.replace(/\uE5CF/,'峰');
  if(speaker.match(/\uE093/)) speaker = speaker.replace(/\uE093/,'柏');
  if(speaker.match(/\uE914/)) speaker = speaker.replace(/\uE914/,'栢');
  if(speaker.match(/\uE8E8/)) speaker = speaker.replace(/\uE8E8/,'涂');
  if(speaker.match(/\uE58E/)) speaker = speaker.replace(/\uE58E/,'沖');
  if(speaker.match(/^許董事長柏松$/)) speaker = '許董事長栢松';
  speaker = speaker.replace("恒偉", "恆偉");
  speaker = speaker.replace("梁長啟源", "梁啟源");
  speaker = speaker.replace("馬耀．", "馬躍．");
  speaker = speaker.replace("院長說", "院長");
  speaker = speaker.replace("文智燈", "文智");
  speaker = speaker.replace("學樟質", "學樟");
  speaker = speaker.replace("育敏質", "育敏");
  speaker = speaker.replace("王王主任委員","王主任委員");
  speaker = speaker.replace(/理事主席/, '');
  speaker = speaker.replace(/主(?:任)?委(?:員)?/, '主委');
  speaker = speaker.replace(/專門委員/, '專委');
  speaker = speaker.replace(/\*/g,'').replace(/\;/g,'');
  return speaker;
}
