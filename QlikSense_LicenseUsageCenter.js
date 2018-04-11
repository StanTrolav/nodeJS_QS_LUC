
var express = require('express');
var bodyParser = require('body-parser');
var QRS = require('qrs');
var DataFrame = require('dataframe-js').DataFrame;

var app = express();


spepCounter = 0;

//Список серверов для проверки
//hostsToCheck = 'sbt-ouiefs-0105.sigma.sbrf.ru,sbt-gas-0011.sigma.sbrf.ru';
hostsToCheck = 'sbt-ouiefs-0104.ca.sbrf.ru, sbt-gas-0018.ca.sbrf.ru, sbt-qs-001.ca.sbrf.ru';
ServicePort = 8888; //Порт по которому работает служба



hostsToCheckCount = hostsToCheck.split(',').length;
console.log('hostsToCheckCount: ' + hostsToCheckCount);

hostsArray = hostsToCheck.trim().split(/\s*,\s*/);
console.log('hostsArray: ' + hostsArray);
for (i = 0; i < hostsArray.length; i++) {console.log(hostsArray[i]);}; //Вывод на экран

//шаги операций
function getXMLReportTable () {

  //Сбор сведений об использовании лицензий. Можно поменять ссылку, чтобы собирать другие сведения
  qrsapipath_GET = '/qrs/license/useraccesstype/full';
  //Для исполнения кода переменные должны быть объявлены заранее
  Object_GOT = [];
  AllObject_GOT = [];
  getAccountListComand = 0;
  CSVReportTable = '';
  XMLReportTable = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n' +
                     '   <soap:Body>\n' +
                     '      <getAccountListResponse xmlns="http://sberbank.ru/soa/service/sudir/itdi/smallsystem.generic.webservice.connector/2.0.1">\n';
  step1();
  //console.log('█▌'+ spepCounter);
    //Второй шаг выполняется после сбора всей информации. Сбор информации с 1 сервера = 1 секунде.
  setTimeout(step2, 1000*hostsToCheckCount);
  //console.log('█▌'+ spepCounter);
    //Завершение алгоритма
  setTimeout(step3, 1000*hostsToCheckCount + 1000);
return XMLReportTable;
};

/*
//Тести работы
getXMLReportTable();
setTimeout(printResults, 1000*hostsToCheckCount + 1500);

function printResults (){
console.log('getXMLReportTable: ' + XMLReportTable.length)
};
*/


urlencodedParser = bodyParser.urlencoded({extended: true});

//ответ на POST запрос
app.post('', urlencodedParser, function (request, response) {
        //Проверка поступившей команды
        getAccountListComand = Math.sign(request.headers['soapaction'].indexOf("/getAccountList")); //Если в заголовке [soapaction] есть текст "/getAccountList"
  console.log('█soapaction: ' + request.headers['soapaction']); //█soapaction:  http://sberbank.ru/soa/service/sudir/itdi/smallsystem.generic.webservice.connector/2.0.1/getAccountList
  console.log('█getAccountListComand: ' + getAccountListComand);
        //Отправка ответа          
        if(getAccountListComand == true) {
            getXMLReportTable(),
            response.status(200),
            response.setHeader('content-type', 'text/xml; charset=utf-8');
            setTimeout(function() {
              response.end(XMLReportTable);
            }, 1000*hostsToCheckCount + 1500); //Время выполнения операции зависит от кол-ва серверов для проверки
        } else {
            response.status(501),
            response.end('Not supported command');
        };
        
});

//Запуск веб-сервиса
app.listen(ServicePort);


//Функции шагов операций. Шаги нужны для того, чтобы дожидаться выполнения формирования данных

    //Сбор всей информации для обработки
    function step1 () {
        console.log('Объединяю таблицы безопасности со всех серверов');
        GetAllData();
        spepCounter = ++spepCounter;
    };//function end

    //Нахождение DISTINCT записи для каждой учётки
    function step2 () {
        console.log("Получено строк для обработки: " + AllObject_GOT.length);
        for (j = 0; j < AllObject_GOT.length; j++) {
            lastUsedDateTime = AllObject_GOT[j].lastUsed.slice(0,19),  //Приведение к формату "2018-04-03T09:03:39.597Z -> 2018-03-02T08:57:12"
            UserDomainName = AllObject_GOT[j].modifiedByUserName.toUpperCase(),                      //К верхнему регистру
            UserName = UserDomainName.slice(UserDomainName.indexOf("\\")+1, UserDomainName.length).trim(); //только имя пользователя
            NumDate = new Date(lastUsedDateTime).getTime();
            //Строка
            if (UserName.length > 1) {
            CSVReportTable += NumDate + ';' + UserName + '\n' ;
            };
        };
        spepCounter = ++spepCounter;
    };//function end

    //Обработка таблицы агрегированием
    function step3 () {
        CleanObject = CSVToArray(CSVReportTable, ';');
        //for (i = 0; i < CleanObject.length; i++) {console.log(CleanObject[i]);}; //Вывод на экран
    ///AllObject_GOT_DataFrame: LastUsedDateTime, UserName
    const columns = ["LastUsedDateTime","UserName"];
    //После создания DataFrame можно проводить операции агрегирования и вычисления максимумов в массиве
    var AllObject_GOT_DataFrame = new DataFrame(CleanObject,columns);

    //Получаем таблицу с уникальными именами пользователей
    UserNameDistinct = AllObject_GOT_DataFrame.distinct('UserName').toArray();
    AllUsersCount = UserNameDistinct.length; //Всего уникальных пользователей

    DistinctObject_GOT = [];

        //Запускаем цикл по всем пользователям
         for (i = 0; i < AllUsersCount; i++) {
                    targetUserName = UserNameDistinct[i];
                    //console.log('targetUserName ' + targetUserName);
                    Max_LastUsedDateTime = AllObject_GOT_DataFrame
                                            //.withColumn("LastUsedDateTime", 0)
                                            //.withColumn("UserName", 1)
                                            .filter({'UserName':targetUserName.toString()})
                                            //.toArray()
                                            ;
                    MaxDate = Max_LastUsedDateTime.stat.max('LastUsedDateTime'); 
                    //console.log('MaxTargetDate ' + MaxDate);
            NewRow = {
            'LastUsedDateTime':MaxDate,
            'UserName':targetUserName
            };
            if(MaxDate > 0) {
                DistinctObject_GOT.push(NewRow);
            };

        };//Заканчиваем цикл

        //console.log('█████████ ' + DistinctObject_GOT.length);
        //Собираю таблицу построчно для передачи 
        for (i = 0; i < DistinctObject_GOT.length; i++) {
          //console.log(DistinctObject_GOT[i]);
          InDate = new Date(DistinctObject_GOT[i].LastUsedDateTime);

          //console.log('█████████ ' + typeof InDate);

          SpecDateFormatString = InDate.customFormat( "#YYYY#-#MM#-#DD#T#hhh#:#mm#:#ss#" ); //2018-03-02T08:57:12
          //console.log('█████████ ' +  SpecDateFormatString);

          XMLReportTable += '         <account>\n' +
                              '            <attributes>\n' +
                              '               <name>login</name>\n' +
                              '               <values>'+ DistinctObject_GOT[i].UserName + '</values>\n' +
                              '            </attributes>\n' +
                              '            <attributes>\n' +
                              '               <name>erlastAccessDate</name>\n' +
                              '               <values>' + SpecDateFormatString + '</values>\n' +
                              '            </attributes>\n' + 
                              '         </account>\n';
        };//Конец таблицы
            XMLReportTable += '      </getAccountListResponse>\n' +
                              '   </soap:Body>\n' +
                              '</soap:Envelope>';
            console.log('Получена результативная таблица XMLReportTable: ' + XMLReportTable.length);
       
    };//function end


////Функции 
        //Сбор всей информации со всех хостов
        function GetAllData () {
            for (i_host = 0; i_host < hostsToCheckCount; i_host++) {

              config = {
                host: hostsArray[i_host],
                useSSL: true,
                cert: '.\\certificats\\' + hostsArray[i_host] + '\\client.pem',
                key: '.\\certificats\\' + hostsArray[i_host] + '\\client_key.pem',
                ca: '.\\certificats\\' + hostsArray[i_host] + '\\root.pem',
                port: 4242,
                authentication: 'certificates',
                headerKey: 'X-Qlik-User',
                xrfkey: 'ABCDEFG123456789',
                headerValue: 'UserDirectory=Internal;UserId=sa_repository'  
              };
               //console.log(i_host);

              //Подключение к QRS сервера 
              new QRS(config).request( 'GET', qrsapipath_GET, null, null)
                         .then( function( data ) {
                               Object_GOT = data;
                               //console.log(config.host);
                               //FullText_GOT = '';
                               //console.log( 'Resived data ' , data_GOT ); //ТО, что получено из страницы
                                  console.log('Resived new data with '+ Object_GOT.length + 'rows'); 
                                 
                            }, function ( err ) {
                               console.error( 'An error occurred: ', err);
                          })
                         .then(function (){
                          //console.log('Got new object: ' + Object_GOT);
                          AllObject_GOT = AllObject_GOT.concat(Object_GOT);
                          }) //then закрыт
                         //.then(function(){
                         // AllObject_GOT = AllObject_GOT.concat(Object_GOT);
                          //console.log('All object: ' + AllObject_GOT);     
                         //}) //then закрыт
                         ;     
            };
            //Цикл закончен
        };
        //Функция закрыта
        //Выполнение запроса GET
        function qrs_GET (qrsapipath_GET) {
         data_GOT = '';
         qrs.request( 'GET', qrsapipath_GET, null, null)
           .then( function( data ) {
                 data_GOT = data;
                 FullText_GOT = '';
                 //console.log( 'Resived data ' , data_GOT ); //ТО, что получено из страницы
                    console.log('Resived new data with '+ data_GOT.length + 'rows from ' + config.host + '/' + qrsapipath_GET); 
                    for (var i=0; i<data_GOT.length ; i++) {
                      //console.log('Resived new data from ' + qrsapipath_GET);
                      FullText_GOT = (data_GOT[i] + '\n').toString() + FullText_GOT;
                    };
                 JSON_GOT = JSON.stringify(data_GOT);
                 Object_GOT = JSON.parse(JSON_GOT);
                 //console.log ('Object: ' + Object_GOT);
                 //console.log('JSON from '+ qrsapipath_GET + ' Done');
                 //console.log('FullText with ' + data_GOT.length + ' lines Done');
              }, function ( err ) {
                 console.error( 'An error occurred: ', err);
              });
           if (FullText_GOT == '' ) {FullText_GOT = 'No Data Got'};
        };

        //Конвертирую CSV содержимое в JSON
        function CSVToJSON(csv){
          var lines=csv.split("\n");
          var result = [];
          var headers=lines[0].split(";");
          for(var i=1;i<lines.length;i++){
              var obj = {};
              var currentline=lines[i].split(";");
              for(var j=0;j<headers.length;j++){
                  obj[headers[j]] = currentline[j];
              }
              result.push(obj);
          }
          //return result; //JavaScript object
          return JSON.stringify(result); //JSON
        };

        function CSVToArray(strData, strDelimiter) {
            // Check to see if the delimiter is defined. If not,
            // then default to comma.
            strDelimiter = (strDelimiter || ",");
            // Create a regular expression to parse the CSV values.
            var objPattern = new RegExp((
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
            // Create an array to hold our data. Give the array
            // a default empty first row.
            var arrData = [[]];
            // Create an array to hold our individual pattern
            // matching groups.
            var arrMatches = null;
            // Keep looping over the regular expression matches
            // until we can no longer find a match.
            while (arrMatches = objPattern.exec(strData)) {
                // Get the delimiter that was found.
                var strMatchedDelimiter = arrMatches[1];
                // Check to see if the given delimiter has a length
                // (is not the start of string) and if it matches
                // field delimiter. If id does not, then we know
                // that this delimiter is a row delimiter.
                if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
                    // Since we have reached a new row of data,
                    // add an empty row to our data array.
                    arrData.push([]);
                }
                // Now that we have our delimiter out of the way,
                // let's check to see which kind of value we
                // captured (quoted or unquoted).
                if (arrMatches[2]) {
                    // We found a quoted value. When we capture
                    // this value, unescape any double quotes.
                    var strMatchedValue = arrMatches[2].replace(
                    new RegExp("\"\"", "g"), "\"");
                } else {
                    // We found a non-quoted value.
                    var strMatchedValue = arrMatches[3];
                }
                // Now that we have our value string, let's add
                // it to the data array.
                arrData[arrData.length - 1].push(strMatchedValue);
            }
            // Return the parsed data.
            return (arrData);
        };

        //Функция для вывода данных в виде таблицы. Внутрь подаётся объект JSON, на выходе получается HTML таблица CrunchifyJSONtoHTML
        function jsonToHtml(objArray, theme) {
            needHeader = true;
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '<table class="' + theme + '">';
            // Only create table head if needHeader is set to True..
            if (needHeader) {
                str += '<thead><tr>';
                for (var index in array[0]) {
                    str += '<th scope="col">' + index + '</th>';
                }
                str += '</tr></thead>';
            }

            // table body
            str += '<tbody>';
            for (var i = 0; i < array.length; i++) {
                str += (i % 2 == 0) ? '<tr class="alt">' : '<tr>';
                for (var index in array[i]) {
                    str += '<td>' + array[i][index] + '</td>';
                }
                str += '</tr>';
            }
            str += '</tbody>'
            str += '</table>';
            return str;
        };


        /*
        token:     description:             example:
        #YYYY#     4-digit year             1999
        #YY#       2-digit year             99
        #MMMM#     full month name          February
        #MMM#      3-letter month name      Feb
        #MM#       2-digit month number     02
        #M#        month number             2
        #DDDD#     full weekday name        Wednesday
        #DDD#      3-letter weekday name    Wed
        #DD#       2-digit day number       09
        #D#        day number               9
        #th#       day ordinal suffix       nd
        #hhhh#     2-digit 24-based hour    17
        #hhh#      military/24-based hour   17
        #hh#       2-digit hour             05
        #h#        hour                     5
        #mm#       2-digit minute           07
        #m#        minute                   7
        #ss#       2-digit second           09
        #s#        second                   9
        #ampm#     "am" or "pm"             pm
        #AMPM#     "AM" or "PM"             PM
        */

        //*** This code is copyright 2002-2016 by Gavin Kistner, !@phrogz.net
        //*** It is covered under the license viewable at http://phrogz.net/JS/_ReuseLicense.txt
        //*** Reuse or modification is free provided you abide by the terms of that license.
        //*** (Including the first two lines above in your source code satisfies the conditions.)
        // Include this code (with notice above ;) in your library; read below for how to use it.
        Date.prototype.customFormat = function(formatString){
          var YYYY,YY,MMMM,MMM,MM,M,DDDD,DDD,DD,D,hhhh,hhh,hh,h,mm,m,ss,s,ampm,AMPM,dMod,th;
          var dateObject = this;
          YY = ((YYYY=dateObject.getFullYear())+"").slice(-2);
          MM = (M=dateObject.getMonth()+1)<10?('0'+M):M;
          MMM = (MMMM=["January","February","March","April","May","June","July","August","September","October","November","December"][M-1]).substring(0,3);
          DD = (D=dateObject.getDate())<10?('0'+D):D;
          DDD = (DDDD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dateObject.getDay()]).substring(0,3);
          th=(D>=10&&D<=20)?'th':((dMod=D%10)==1)?'st':(dMod==2)?'nd':(dMod==3)?'rd':'th';
          formatString = formatString.replace("#YYYY#",YYYY).replace("#YY#",YY).replace("#MMMM#",MMMM).replace("#MMM#",MMM).replace("#MM#",MM).replace("#M#",M).replace("#DDDD#",DDDD).replace("#DDD#",DDD).replace("#DD#",DD).replace("#D#",D).replace("#th#",th);

          h=(hhh=dateObject.getHours());
          if (h==0) h=24;
          if (h>12) h-=12;
          hh = h<10?('0'+h):h;
          hhhh = hhh<10?('0'+hhh):hhh;
          AMPM=(ampm=hhh<12?'am':'pm').toUpperCase();
          mm=(m=dateObject.getMinutes())<10?('0'+m):m;
          ss=(s=dateObject.getSeconds())<10?('0'+s):s;
          return formatString.replace("#hhhh#",hhhh).replace("#hhh#",hhh).replace("#hh#",hh).replace("#h#",h).replace("#mm#",mm).replace("#m#",m).replace("#ss#",ss).replace("#s#",s).replace("#ampm#",ampm).replace("#AMPM#",AMPM);
        };
