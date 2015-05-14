import request from "request";
import cheerio from "cheerio";

request.post({
  uri: 'http://lci.ly.gov.tw/LyLCEW/lcivCommQry.action',
  form: {
    sortFieldListSource: 'meeting_date1:1,file_seqno:0',
    fieldNameListSource: 'year,volume,book_id,book_id_chn,serial_number,subtitle,communique_type,meeting_date,publish_date,pdf_filename2,file_seqno,check_vod_flag,page_start,page_end,$9$',
    queryIndexeListSource:'0:lciv_commfile',
    rangeCondition: '$year_vol>=00000 and $year_vol<=99999',
    Process2: '',
    querySentence: '租稅正義',
    meetingDateS:'',
    meetingDateE:'',
    checkAllCommType: 'on',
    appellationSelect:'',
    committeeSelect:'',
    yearS:'',
    volumeS:'',
    yearE:'',
    volumeE:'',
    serialNoS:'',
    serialNoE:'',
    publishDateS:'',
    publishDateE:'',
    searchSub:0,
    searchMode: 'Precise',
    sort:0
  }
},(err, res, body)=>{
 var $ = cheerio.load(body);
 var counts = $($('#relatedSearch2 font')[1]).text();
 var i,date,category,link, tds;
 for(i=0; i<counts; i++) {
  tds = $(`#searchResult_${i} td`);
  if($(tds[3]).text().trim().match(/\t/)) {
    date = $(tds[3]).text().trim().split(/\t/)[0].replace(/\n/,"");
  } else {
    date = $(tds[3]).text().trim();
  }

  date = date.split('/').map((e,i) => {
    if(i===0) return ~~e+1911;
    return ~~e;
  }).join('/');
  category = $(tds[1]).text().trim();
  link = $(tds[3]).attr('onclick').replace("window.open('","").replace("');","").replace("'+'","");
  console.log(`${date},${category},${link}`);
 }

});