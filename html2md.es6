import md from "html-md";
import path from "path";
import glob from "glob";
import fs from "fs";

if(!fs.existsSync(__dirname +'/md')) fs.mkdirSync(__dirname + '/md');

glob(path.resolve(__dirname + '/htm/*.htm'), (err, files) => {
  files.map((it)=> {
    var html = fs.readFileSync(it).toString();
    var markdown = md(html);
    var file_name = path.basename(it).replace('htm','md');
    fs.writeFileSync(path.resolve(__dirname + `/md/${file_name}`), markdown);
  });
});