/*
京东example
更新时间：2020-08-29
脚本说明：
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
// quantumultx
[task_local]
#京东example
11 5 * * * https://raw.githubusercontent.com/yangtingxiao/scripts/master/jd/jd_Example.js, tag=京东example, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jxc.png, enabled=true
// Loon
[Script]
cron "11 5 * * *" script-path=https://raw.githubusercontent.com/yangtingxiao/scripts/master/jd/jd_Example.js,tag=京东example
// Surge
京东example = type=cron,cronexp=11 5 * * *,wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/yangtingxiao/scripts/master/jd/jd_Example.js
 */
const $ = new Env('京东example');
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const coinToBeans = $.getdata('coinToBeans') || 20; //兑换多少数量的京豆，默认兑换不兑换
const STRSPLIT = "|";
const needSum = true;     //是否需要显示汇总
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
} else {
  cookiesArr.push($.getdata('CookieJD'));
  cookiesArr.push($.getdata('CookieJD2'));
}

const JD_API_HOST = `https://api.m.jd.com/api?appid=jdsupermarket`;
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    cookie = cookiesArr[i];
    if (cookie) {
      initial();
      await  QueryJDUserInfo();
      if (!merge.enabled)  //cookie不可用
      {
        $.setdata('', `CookieJD${i ? i + 1 : "" }`);//cookie失效，故清空cookie。
        $.msg($.name, `【提示】京东账号${merge.nickname} cookie已过期！请先获取cookie\n直接使用NobyDa的京东签到获取`, 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
        continue;
      }
      //await smtg_receiveCoin();
      if (coinToBeans) {
        await smtg_queryPrize();
      }
      await msgShow();
    }
  }
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done())


//获取昵称（直接用，勿删）
function QueryJDUserInfo(timeout = 0) {
  return new Promise((resolve) => {
    setTimeout( ()=>{
      let url = {
        url : `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
        headers : {
          'Referer' : `https://wqs.jd.com/my/iserinfo.html`,
          'Cookie' : cookie
        }
      }
      $.get(url, (err, resp, data) => {
        try {
          data = JSON.parse(data);
          if (data.retcode === 13) {
            merge.enabled = false
            return
          }
          merge.nickname = data.base.nickname;
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}

let index = 0
function smtg_receiveCoin(timeout = 0) {
  return new Promise((resolve) => {
    setTimeout( ()=>{
      let url = {
        url : `${JD_API_HOST}&functionId=smtg_receiveCoin&clientVersion=8.0.0&client=m&body=%7B%22type%22:2%7D&t=${Date.now()}`,
        headers : {
          'Origin' : `https://jdsupermarket.jd.com`,
          'Cookie' : cookie,
          'Connection' : `keep-alive`,
          'Accept' : `application/json, text/plain, */*`,
          'Referer' : `https://jdsupermarket.jd.com/game/?tt=1597540727225`,
          'Host' : `api.m.jd.com`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `zh-cn`
        }
      }
      if (!timeout) index = 0;
      $.get(url, async (err, resp, data) => {
        try {
          data = JSON.parse(data);
          if (data.data.bizCode !== 0 && data.data.bizCode !== 809) {
            merge.blueCoin.fail++;
            merge.blueCoin.notify = `${data.data.bizMsg}`;
            return
          }
          if (data.data.bizCode === 0) {
            merge.blueCoin.success++;
            merge.blueCoin.prizeCount += data.data.result.receivedBlue;
            index ++;
            console.log(`【京东账号】${merge.nickname} 第${index}次领蓝币成功，获得${data.data.result.receivedBlue}个\n`)
            if (!data.data.result.isNextReceived) return;
          }
          await  smtg_receiveCoin(3000);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}
//查询任务
function smtg_queryPrize(timeout = 0){
  return new Promise((resolve) => {
    setTimeout( ()=>{
      let url = {
        url : `${JD_API_HOST}&functionId=smtg_queryPrize&clientVersion=8.0.0&client=m&body=%7B%7D&t=${Date.now()}`,
        headers : {
          'Origin' : `https://jdsupermarket.jd.com`,
          'Cookie' : cookie,
          'Connection' : `keep-alive`,
          'Accept' : `application/json, text/plain, */*`,
          'Referer' : `https://jdsupermarket.jd.com/game/?tt=1597540727225`,
          'Host' : `api.m.jd.com`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `zh-cn`
        }
      }
      $.post(url, async (err, resp, data) => {
        try {
          data = JSON.parse(data);
          if (data.data.bizCode !== 0) {
            merge.jdBeans.fail++;
            merge.jdBeans.notify = `${data.data.bizMsg}`;
            return
          }
          if (data.data.bizCode === 0) {
            if (data.data.result.prizeList[0].beanType) {
              console.log(`【京东账号】${merge.nickname} 查询换京豆ID成功，ID:${data.data.result.prizeList[0].prizeId}`)
            } else {
              console.log(`【京东账号】${merge.nickname} 查询换京豆ID失败，没有查询到`)
              merge.jdBeans.fail++;
              merge.jdBeans.notify = `东哥今天不给换`;
              return ;
            }
            if (data.data.result.prizeList[0].targetNum === data.data.result.prizeList[0].finishNum) {
              merge.jdBeans.fail++;
              merge.jdBeans.notify = `${data.data.result.prizeList[0].subTitle}`;
              return ;
            }
          }
          await  smtg_obtainPrize(data.data.result.prizeList[0].prizeId,1000);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}

//换京豆
function smtg_obtainPrize(prizeId,timeout = 0) {
  return new Promise((resolve) => {
    setTimeout( ()=>{
      let url = {
        url : `${JD_API_HOST}&functionId=smtg_obtainPrize&clientVersion=8.0.0&client=m&body=%7B%22prizeId%22:%22${prizeId}%22%7D&t=${Date.now()}`,
        headers : {
          'Origin' : `https://jdsupermarket.jd.com`,
          'Cookie' : cookie,
          'Connection' : `keep-alive`,
          'Accept' : `application/json, text/plain, */*`,
          'Referer' : `https://jdsupermarket.jd.com/game/?tt=1597540727225`,
          'Host' : `api.m.jd.com`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `zh-cn`
        }
      }
      $.post(url, async (err, resp, data) => {
        try {
          data = JSON.parse(data);
          if (data.data.bizCode !== 0) {
            merge.jdBeans.fail++;
            merge.jdBeans.notify = `${data.data.bizMsg}`;
            return
          }
          if (data.data.bizCode === 0) {
            merge.jdBeans.success++;
            merge.jdBeans.prizeCount++;
            console.log(`【京东账号】${merge.nickname} 第${data.data.result.exchangeNum}次换京豆成功`)
            if (data.data.result.exchangeNum === 20 || merge.jdBeans.prizeCount == coinToBeans || data.data.result.blur < 500) return;
          }
          await  smtg_obtainPrize(prizeId,1000);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}


//初始化
function initial() {
  merge = {
    nickname: "",
    enabled: true,
    blueCoin: {prizeDesc : "收取|蓝币|个",number : true},  //定义 动作|奖励名称|奖励单位   是否是数字
    jdBeans: {prizeDesc : "兑换|京豆|个",number : true}
  }
  for (let i in merge) {
    merge[i].success = 0;
    merge[i].fail = 0;
    merge[i].prizeCount = 0;
    merge[i].notify = "";
    merge[i].show = true;
  }
  merge.jdBeans.show =Boolean(coinToBeans);
}
//通知
function msgShow() {
  let message = "";
  let url ={ "open-url" : `openjd://virtual?params=%7B%20%22category%22:%20%22jump%22,%20%22des%22:%20%22m%22,%20%22url%22:%20%22https://jdsupermarket.jd.com/loading%22%20%7D`}
  let title = `京东账号：${merge.nickname}`;
  for (let i in merge) {
    if (typeof (merge[i]) !== "object" || !merge[i].show) continue;
    if (merge[i].notify.split("").reverse()[0] === "\n") merge[i].notify = merge[i].notify.substr(0,merge[i].notify.length - 1);
    message += `${merge[i].prizeDesc.split(STRSPLIT)[0]}${merge[i].prizeDesc.split(STRSPLIT)[1]}：` + (merge[i].success ? `${merge[i].prizeCount.toFixed(2)}${merge[i].prizeDesc.split(STRSPLIT)[2]}\n` : `失败：${merge[i].notify}\n`)
  }
//合计
if (needSum)
  {
    $.sum = {};
    for (let i in merge) {
         if (typeof (merge[i]) !== "object" || !merge[i].show) continue;
         if (typeof ($.sum[merge[i].prizeDesc.split(STRSPLIT)[1]]) === "undefined")  $.sum[merge[i].prizeDesc.split(STRSPLIT)[1]] = {count : 0};
         $.sum[merge[i].prizeDesc.split(STRSPLIT)[1]].count += merge[i].prizeCount;
    }
    message += `合计：`
    for (let i in $.sum)
    {
      message += `${$.sum[i].count.toFixed(2)}${i}，`
    }
  }
  message = message.substr(0,message.length - 1);
  $.msg($.name, title, message, url);
}


function Env(t,s){return new class{constructor(t,s){this.name=t,this.data=null,this.dataFile="box.dat",this.logs=[],this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}getScript(t){return new Promise(s=>{$.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=s&&s.timeout?s.timeout:o;const[h,a]=i.split("@"),r={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":h,Accept:"*/*"}};$.post(r,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),o=JSON.stringify(this.data);e?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(s,o):this.fs.writeFileSync(t,o)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return e;return o}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),o=e?this.getval(e):"";if(o)try{const t=JSON.parse(o);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(s),h=this.getval(i),a=i?"null"===h?null:h||"{}":"{}";try{const s=JSON.parse(a);this.lodash_set(s,o,t),e=this.setval(JSON.stringify(s),i)}catch(s){const h={};this.lodash_set(h,o,t),e=this.setval(JSON.stringify(h),i)}}else e=$.setval(t,s);return e}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isLoon()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status),s(t,e,i)}):this.isQuanX()?$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t)):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t)))}post(t,s=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),delete t.headers["Content-Length"],this.isSurge()||this.isLoon())$httpClient.post(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status),s(t,e,i)});else if(this.isQuanX())t.method="POST",$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t));else if(this.isNode()){this.initGotEnv(t);const{url:e,...i}=t;this.got.post(e,i).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t))}}time(t){let s={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in s)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?s[e]:("00"+s[e]).substr((""+s[e]).length)));return t}msg(s=t,e="",i="",o){const h=t=>!t||!this.isLoon()&&this.isSurge()?t:"string"==typeof t?this.isLoon()?t:this.isQuanX()?{"open-url":t}:void 0:"object"==typeof t&&(t["open-url"]||t["media-url"])?this.isLoon()?t["open-url"]:this.isQuanX()?t:void 0:void 0;this.isSurge()||this.isLoon()?$notification.post(s,e,i,h(o)):this.isQuanX()&&$notify(s,e,i,h(o)),this.logs.push("","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="),this.logs.push(s),e&&this.logs.push(e),i&&this.logs.push(i)}log(...t){t.length>0?this.logs=[...this.logs,...t]:console.log(this.logs.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();e?$.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):$.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,s)}
