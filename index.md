# nodeJS_QS_LUC
Node JS Qlik Sense License Usage Center
Модуль предназначен для доставки информации об использовании пользовательских лицензий Qlik Sense. 
# Особенности
- Модуль nodeJS_QS_LUC устанавливается в качестве службы.
- Сбор информации с серверов осуществляется по сертификатам
- Информация предоставляется после получения SOAP вызова с заголовком [soapaction], содержащим команду "/getAccountList"
# Подготовка
Для работы модуля необходимо произвести выгрузку сертификатов Qlik Sense с каждого сервера, с которого необходимо получать информацию. Выгрузка сертификатов производится через QMC:
1. Войдите в QMC Sense Server
2. Start -> CONFIGURE SYSTEM -> Certificates
3. Add machine name: укажите полное имя сервера "example.ca.sbrf.ru"
4. Export file format for certificates: Установите PEM-Format
5. Нажмите кнопку "Export certificates"
6. Заберите сертификаты с сервера Sense и поместите их в папку .\certificats\<Server Full Name> после установки модуля
# Установка модуля
1. Распокавать содержимое архива в папку D:\nodeJS_QS_LUC
2. Получить сертификаты серверов Sense, участвующих в мониторинге
3. Прописать в файле QlikSense_LicenseUsageCenter.js список серверов Sense и указать порт по которому будет доступен сервис:
```sh
hostsToCheck = 'sbt-ouiefs-0104.ca.sbrf.ru, sbt-gas-0018.ca.sbrf.ru, sbt-qs-001.ca.sbrf.ru';
ServicePort = 8888;
```
4. Поместить сертификаты формата PEM в папку \certificats. При этом каждый набор сертификатов сервера Sense должен быть помещён в подпапку с именем этого сервера Sense.
5. Запустить с правами администратора файл InstallService.bat
6. Убедиться, что служба nodeJS_QS_LUC в состоянии "Running"
7. Проверить работу сервиса, выполнив тестовое обращение

**Разработано СБТ ДРАРиСС ЦК BI Москва**

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen.)

   [node.js]: <http://nodejs.org>
