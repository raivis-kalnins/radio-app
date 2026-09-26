(function () {
  'use strict';

  /* Lightweight compatibility helpers for older mobile browsers. */
  if (!Object.assign) Object.assign = function (target) { if (target == null) throw new TypeError('Cannot convert undefined or null to object'); target = Object(target); for (var i=1;i<arguments.length;i+=1) { var source=arguments[i]; if (source == null) continue; for (var key in source) if (Object.prototype.hasOwnProperty.call(source,key)) target[key]=source[key]; } return target; };
  if (!String.prototype.padStart) String.prototype.padStart = function (length, fill) { var value=String(this), pad=String(fill===undefined?' ':fill); if (value.length>=length||!pad) return value; while (pad.length<length-value.length) pad+=pad; return pad.slice(0,length-value.length)+value; };
  if (typeof Element !== 'undefined' && !Element.prototype.replaceChildren) Element.prototype.replaceChildren = function () { while (this.firstChild) this.removeChild(this.firstChild); for (var i=0;i<arguments.length;i+=1) this.appendChild(arguments[i]); };
  if (typeof Promise !== 'undefined' && !Promise.prototype.finally) Promise.prototype.finally = function (callback) { var P=this.constructor; return this.then(function(value){return P.resolve(callback()).then(function(){return value;});},function(reason){return P.resolve(callback()).then(function(){throw reason;});}); };

  var h = React.createElement;
  var API_URL = 'api.php';
  var REPORT_ICONS = {traffic:'🚗', roadwork:'🚧', hazard:'⚠️', police:'🚓', camera:'📷', closure:'⛔'};
  var LANGUAGES = {en:'English',lv:'Latviešu',ru:'Русский',uk:'Українська',pl:'Polski',de:'Deutsch',lt:'Lietuvių',et:'Eesti',sv:'Svenska',no:'Norsk',da:'Dansk',fi:'Suomi'};
  var EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  var BALTIC_COUNTRIES = ['EE','LV','LT'];
  var NORDIC_COUNTRIES = ['DK','FI','IS','NO','SE'];
  var EUROPE_COUNTRIES = ['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB','VA'];
  var NAV_REGIONS = ['ALL','EU','BALTIC','NORDIC'];
  var NAV_COUNTRIES = NAV_REGIONS.concat(EUROPE_COUNTRIES);
  var RADIO_COUNTRIES = ['LV','GB','UA','US','CA','AU'];
  var COUNTRY_CENTERS = {
    ALL:{lat:54.2,lon:15.0,zoom:4},EU:{lat:50.8,lon:10.5,zoom:4},BALTIC:{lat:57.2,lon:24.6,zoom:6},NORDIC:{lat:62.0,lon:15.0,zoom:4},
    AL:{lat:41.33,lon:19.82,zoom:7},AD:{lat:42.51,lon:1.52,zoom:10},AT:{lat:48.21,lon:16.37,zoom:7},BY:{lat:53.90,lon:27.57,zoom:6},BE:{lat:50.85,lon:4.35,zoom:8},BA:{lat:43.86,lon:18.41,zoom:7},BG:{lat:42.70,lon:23.32,zoom:7},HR:{lat:45.81,lon:15.98,zoom:7},CY:{lat:35.19,lon:33.38,zoom:8},CZ:{lat:50.08,lon:14.44,zoom:7},DK:{lat:55.68,lon:12.57,zoom:7},EE:{lat:59.44,lon:24.75,zoom:8},FI:{lat:60.17,lon:24.94,zoom:6},FR:{lat:48.86,lon:2.35,zoom:6},DE:{lat:52.52,lon:13.41,zoom:6},GR:{lat:37.98,lon:23.73,zoom:6},HU:{lat:47.50,lon:19.04,zoom:7},IS:{lat:64.15,lon:-21.94,zoom:6},IE:{lat:53.35,lon:-6.26,zoom:7},IT:{lat:41.90,lon:12.50,zoom:6},XK:{lat:42.66,lon:21.17,zoom:8},LV:{lat:56.95,lon:24.11,zoom:8},LI:{lat:47.14,lon:9.52,zoom:10},LT:{lat:54.69,lon:25.28,zoom:8},LU:{lat:49.61,lon:6.13,zoom:10},MT:{lat:35.90,lon:14.51,zoom:10},MD:{lat:47.01,lon:28.86,zoom:7},MC:{lat:43.74,lon:7.42,zoom:12},ME:{lat:42.44,lon:19.26,zoom:8},NL:{lat:52.37,lon:4.90,zoom:7},MK:{lat:42.00,lon:21.43,zoom:8},NO:{lat:59.91,lon:10.75,zoom:5},PL:{lat:52.23,lon:21.01,zoom:6},PT:{lat:38.72,lon:-9.14,zoom:6},RO:{lat:44.43,lon:26.10,zoom:6},RU:{lat:55.76,lon:37.62,zoom:4},SM:{lat:43.94,lon:12.45,zoom:11},RS:{lat:44.82,lon:20.46,zoom:7},SK:{lat:48.15,lon:17.11,zoom:7},SI:{lat:46.06,lon:14.51,zoom:8},ES:{lat:40.42,lon:-3.70,zoom:6},SE:{lat:59.33,lon:18.07,zoom:5},CH:{lat:46.95,lon:7.45,zoom:7},TR:{lat:39.93,lon:32.86,zoom:5},UA:{lat:50.45,lon:30.52,zoom:6},GB:{lat:51.51,lon:-0.13,zoom:6},VA:{lat:41.90,lon:12.45,zoom:13}
  };
  function countryFlag(code){if(code==='ALL')return '🌍';if(code==='EU')return '🇪🇺';if(code==='BALTIC')return '◈';if(code==='NORDIC')return '❄';return String.fromCodePoint.apply(String,code.split('').map(function(c){return 127397+c.charCodeAt(0);}));}
  function countryName(code,lang){var dict=I18N[lang]||I18N.en;if(code==='ALL')return dict.allEurope||dict.europe||'All Europe';if(code==='EU')return dict.europeanUnion||'European Union';if(code==='BALTIC')return dict.balticStates||'Baltic states';if(code==='NORDIC')return dict.nordicCountries||'Nordic countries';try{if(window.Intl&&Intl.DisplayNames)return new Intl.DisplayNames([lang],{type:'region'}).of(code);}catch(_){}return code;}


  var I18N = {
    en: {
      brandTagline:'Navigate. Listen. Keep moving.', heroEyebrow:'Navigation + live radio', heroTitle:'One fast app for the road.',
      heroText:'Plan routes, follow live GPS, report road issues and listen to Latvian, UK or Ukrainian radio without leaving navigation.',
      featureNav:'Live navigation', featureRadio:'LV + UK + UA radio', featureInstall:'Installable app', continueGuest:'Continue as guest',
      signIn:'Sign in', createAccount:'Create account', language:'Language', navMap:'Map', navRadio:'Radio', navReports:'Reports', navProfile:'Profile',
      currentLocation:'Current location', destinationPlaceholder:'Where are you going?', locating:'Finding your location…', search:'Search',
      routeReady:'Route ready', routeDistance:'Distance', routeTime:'Drive time', startNavigation:'Start navigation', stopNavigation:'End navigation',
      savePlace:'Save place', route:'Route', recenter:'Recenter', zoomIn:'Zoom in', zoomOut:'Zoom out', follow:'Follow location',
      noRoute:'Choose a destination to build a route.', locationDenied:'Location access is required for navigation.', routeFailed:'Could not build this route.',
      searching:'Searching…', noResults:'No matching places found.', countryUK:'United Kingdom', countryLV:'Latvia',
      instructionContinue:'Continue on the route', instructionArrive:'You have arrived', instructionLeft:'Turn left', instructionRight:'Turn right',
      instructionStraight:'Continue straight', instructionRoundabout:'Enter the roundabout', remaining:'Remaining', eta:'ETA', speed:'Speed',
      rerouting:'Rebuilding route…', offRoute:'You are off route', wakeLockOn:'Screen awake', wakeLockOff:'Wake lock unavailable',
      report:'Report', addReport:'Add road report', reportSubtitle:'Share a current road issue from your location.', reportNote:'Optional note',
      sendReport:'Send report', reportSent:'Report added.', reportTraffic:'Traffic', reportRoadwork:'Roadworks', reportHazard:'Hazard',
      reportPolice:'Police', reportCamera:'Camera', reportClosure:'Closure', reportsTitle:'Road reports', reportsSubtitle:'Recent community reports near your area.',
      noReports:'No recent reports nearby.', justNow:'Just now', radioTitle:'Live radio', radioSubtitle:'Main stations from Latvia, the United Kingdom and Ukraine.',
      latvia:'Latvia', unitedKingdom:'United Kingdom', searchStations:'Search stations', noStations:'No stations found.',
      stationsLive:'Fresh station directory', stationsCache:'Saved station directory', stationsFallback:'Built-in station list',
      connecting:'Connecting…', buffering:'Buffering…', playing:'Playing', paused:'Paused', reconnecting:'Reconnecting…', connectionFailed:'Stream unavailable',
      radioCacheNote:'Station details are cached for faster loading. Live broadcasts still require internet.', radioDirect:'Direct stream', radioRelay:'Secure relay', radioTapAgain:'Tap play to try again.',
      profileTitle:'Profile', guestUser:'Guest user', registeredUser:'Registered user', account:'Account', signOut:'Sign out',
      languageSetting:'App language', installApp:'Install go-app', installDescription:'Add go-app to your home screen for a full-screen mobile experience.',
      install:'Install', installed:'Installed', installHelp:'Installation help', iosInstallTitle:'Install on iPhone or iPad',
      installAndroid:'Install for Android', installApple:'Install for Apple', androidBadgeText:'Android phone or tablet', appleBadgeText:'iPhone or iPad',
      iosStep1:'Open this page in Safari.', iosStep2:'Tap the Share button in Safari.', iosStep3:'Choose “Add to Home Screen”, then confirm.',
      androidInstallTitle:'Install on Android', androidInstallText:'Tap Install below when Chrome offers it. Otherwise open the browser menu and choose “Install app” or “Add to Home screen”.',
      savedPlaces:'Saved places', noSavedPlaces:'No saved places yet.', placeName:'Place name', save:'Save', saved:'Saved.', delete:'Delete',
      loginTitle:'Welcome back', registerTitle:'Create your account', fullName:'Full name', email:'Email address', password:'Password',
      cancel:'Cancel', submitLogin:'Sign in', submitRegister:'Create account', accountCreated:'Account created. Sign in to continue.',
      loginSuccess:'Signed in.', logoutSuccess:'Signed out. Guest mode is still available.', profileSync:'Saved to your account.',
      guestHint:'Guest mode keeps preferences on this device. Register to sync saved places.', online:'Online', offline:'Offline',
      installReady:'go-app is ready to install.', gpsAccuracy:'GPS accuracy', routeAlternatives:'Route options', fastest:'Fastest',
      close:'Close', retry:'Retry', loading:'Loading…', unknownError:'Something went wrong.', usePlace:'Navigate here',
      radioRetrying:'Trying another stream', stationCount:'stations', reportLocation:'Your current GPS position will be used.',
      chooseType:'Choose report type', saveDestination:'Save destination', locationPending:'Waiting for GPS…', permissionHelp:'Enable location permission in your browser settings.',
      appVersion:'App version', dataMode:'JSON storage', pwaMode:'PWA install', cacheReady:'Offline app shell ready', keepAwakeSetting:'Keep screen awake', keepAwakeDescription:'Request Wake Lock while go-app is open.', enabled:'On', disabled:'Off', resetView:'Reset map view', unitsSetting:'Distance units', unitsDescription:'Choose kilometres or miles for distance and speed.', kilometres:'Kilometres', miles:'Miles', unitKm:'km / km/h', unitMiles:'mi / mph', navSearch:'Search', travelMode:'Travel mode', car:'Car', bike:'Bike', walk:'Walk', namedays:'Namedays', todayNamedays:'Today’s namedays', weather:'Weather', iceWarning:'Possible ice', snowWarning:'Snow risk', windWarning:'Strong wind', cameraAhead:'Speed camera ahead', trafficAhead:'Traffic report ahead', speedLimit:'Limit', overSpeed:'Slow down', nearby:'Nearby', fuel:'Fuel', parking:'Parking', priceUnavailable:'Price not available', mapStyle:'Map style', roadMap:'Road', satellite:'Satellite', stopAudio:'Stop audio', localAudio:'My audio', selectAudio:'Choose MP3 or audio files', localFilesNote:'Files stay on this device and are not uploaded.', spotify:'Spotify', connectSpotify:'Connect Spotify', disconnectSpotify:'Disconnect', proOnly:'Pro account required', support:'Support', feedback:'Feedback', contactUs:'Contact us', feedbackCategory:'Message type', message:'Message', sendMessage:'Send message', feedbackSent:'Thank you. Your message was sent.', placeSearchTitle:'Search places and addresses', searchAllEurope:'Search towns, cities, addresses and objects across Europe', placeDetails:'Place details', address:'Address', postcode:'Postcode', townCity:'Town / city', openingHours:'Opening hours', website:'Website', phone:'Phone', navigate:'Navigate', requestPro:'Request Pro access', pendingApproval:'Registration sent for administrator approval.', accountPending:'Your account must be approved before sign-in.', mediaRadio:'Radio', mediaFiles:'My files', mediaSpotify:'Spotify', routeRestored:'Previous trip restored', showNearby:'Show fuel and parking', noNearby:'No nearby places found.', stop:'Stop', resume:'Resume', supportIntro:'Questions or ideas? Send feedback or contact support.', adminPanel:'Admin panel', mapRoadView:'Modern road view', mapSatelliteView:'Satellite view', selectedPlace:'Selected place', chooseResult:'Choose a result to see full address and start navigation.', alert:'Alert', cameraDistance:'Camera distance', trafficDistance:'Traffic distance'
    },
    lv: {
      brandTagline:'Navigē. Klausies. Turpini ceļu.', heroEyebrow:'Navigācija + tiešraides radio', heroTitle:'Viena ātra lietotne ceļam.',
      heroText:'Plāno maršrutus, seko GPS, ziņo par ceļa problēmām un klausies Latvijas, Lielbritānijas vai Ukrainas radio, neatstājot navigāciju.',
      featureNav:'GPS navigācija', featureRadio:'LV + UK + UA radio', featureInstall:'Instalējama lietotne', continueGuest:'Turpināt kā viesim',
      signIn:'Pieteikties', createAccount:'Izveidot kontu', language:'Valoda', navMap:'Karte', navRadio:'Radio', navReports:'Ziņojumi', navProfile:'Profils',
      currentLocation:'Pašreizējā atrašanās vieta', destinationPlaceholder:'Uz kurieni doties?', locating:'Meklē atrašanās vietu…', search:'Meklēt',
      routeReady:'Maršruts gatavs', routeDistance:'Attālums', routeTime:'Braukšanas laiks', startNavigation:'Sākt navigāciju', stopNavigation:'Beigt navigāciju',
      savePlace:'Saglabāt vietu', route:'Maršruts', recenter:'Centrēt', zoomIn:'Pietuvināt', zoomOut:'Attālināt', follow:'Sekot atrašanās vietai',
      noRoute:'Izvēlies galamērķi, lai izveidotu maršrutu.', locationDenied:'Navigācijai nepieciešama piekļuve atrašanās vietai.', routeFailed:'Maršrutu neizdevās izveidot.',
      searching:'Meklē…', noResults:'Atbilstošas vietas netika atrastas.', countryUK:'Lielbritānija', countryLV:'Latvija',
      instructionContinue:'Turpini pa maršrutu', instructionArrive:'Esi ieradies', instructionLeft:'Pagriezies pa kreisi', instructionRight:'Pagriezies pa labi',
      instructionStraight:'Turpini taisni', instructionRoundabout:'Iebrauc aplī', remaining:'Atlicis', eta:'Ierašanās', speed:'Ātrums',
      rerouting:'Pārrēķina maršrutu…', offRoute:'Esi novirzījies no maršruta', wakeLockOn:'Ekrāns paliek ieslēgts', wakeLockOff:'Ekrāna bloķēšana nav pieejama',
      report:'Ziņot', addReport:'Pievienot ceļa ziņojumu', reportSubtitle:'Dalies ar aktuālu problēmu savā atrašanās vietā.', reportNote:'Piezīme nav obligāta',
      sendReport:'Nosūtīt ziņojumu', reportSent:'Ziņojums pievienots.', reportTraffic:'Satiksme', reportRoadwork:'Ceļa darbi', reportHazard:'Bīstamība',
      reportPolice:'Policija', reportCamera:'Kamera', reportClosure:'Slēgts ceļš', reportsTitle:'Ceļa ziņojumi', reportsSubtitle:'Jaunākie kopienas ziņojumi tuvumā.',
      noReports:'Tuvumā nav jaunu ziņojumu.', justNow:'Tikko', radioTitle:'Tiešraides radio', radioSubtitle:'Galvenās Latvijas, Lielbritānijas un Ukrainas radiostacijas.',
      latvia:'Latvija', unitedKingdom:'Lielbritānija', searchStations:'Meklēt radiostacijas', noStations:'Radiostacijas netika atrastas.',
      stationsLive:'Aktuāls staciju saraksts', stationsCache:'Saglabāts staciju saraksts', stationsFallback:'Iebūvēts staciju saraksts',
      connecting:'Savienojas…', buffering:'Ielādē…', playing:'Atskaņo', paused:'Pauze', reconnecting:'Savienojas atkārtoti…', connectionFailed:'Straume nav pieejama',
      radioCacheNote:'Staciju dati tiek saglabāti ātrākai ielādei. Tiešraidei joprojām vajadzīgs internets.', radioDirect:'Tiešā straume', radioRelay:'Drošais starpniekserveris', radioTapAgain:'Nospied atskaņot, lai mēģinātu vēlreiz.',
      profileTitle:'Profils', guestUser:'Viesa lietotājs', registeredUser:'Reģistrēts lietotājs', account:'Konts', signOut:'Izrakstīties',
      languageSetting:'Lietotnes valoda', installApp:'Instalēt go-app', installDescription:'Pievieno go-app sākuma ekrānam pilnekrāna mobilai lietošanai.',
      install:'Instalēt', installed:'Instalēta', installHelp:'Instalēšanas palīdzība', iosInstallTitle:'Instalēt iPhone vai iPad',
      installAndroid:'Instalēt Android', installApple:'Instalēt Apple ierīcē', androidBadgeText:'Android tālrunis vai planšete', appleBadgeText:'iPhone vai iPad',
      iosStep1:'Atver šo lapu Safari pārlūkā.', iosStep2:'Safari nospied kopīgošanas pogu.', iosStep3:'Izvēlies “Pievienot sākuma ekrānam” un apstiprini.',
      androidInstallTitle:'Instalēt Android ierīcē', androidInstallText:'Nospied Instalēt, kad Chrome to piedāvā. Citādi atver pārlūka izvēlni un izvēlies “Instalēt lietotni” vai “Pievienot sākuma ekrānam”.',
      savedPlaces:'Saglabātās vietas', noSavedPlaces:'Vēl nav saglabātu vietu.', placeName:'Vietas nosaukums', save:'Saglabāt', saved:'Saglabāts.', delete:'Dzēst',
      loginTitle:'Laipni atgriezies', registerTitle:'Izveido savu kontu', fullName:'Vārds un uzvārds', email:'E-pasta adrese', password:'Parole',
      cancel:'Atcelt', submitLogin:'Pieteikties', submitRegister:'Izveidot kontu', accountCreated:'Konts izveidots. Piesakies, lai turpinātu.',
      loginSuccess:'Pieteikšanās veiksmīga.', logoutSuccess:'Esi izrakstījies. Viesa režīms joprojām pieejams.', profileSync:'Saglabāts tavā kontā.',
      guestHint:'Viesa režīms saglabā iestatījumus šajā ierīcē. Reģistrējies, lai sinhronizētu vietas.', online:'Tiešsaistē', offline:'Bezsaistē',
      installReady:'go-app ir gatava instalēšanai.', gpsAccuracy:'GPS precizitāte', routeAlternatives:'Maršruta varianti', fastest:'Ātrākais',
      close:'Aizvērt', retry:'Mēģināt vēlreiz', loading:'Ielādē…', unknownError:'Radās kļūda.', usePlace:'Navigēt uz šo vietu',
      radioRetrying:'Mēģina citu straumi', stationCount:'stacijas', reportLocation:'Tiks izmantota tava pašreizējā GPS atrašanās vieta.',
      chooseType:'Izvēlies ziņojuma veidu', saveDestination:'Saglabāt galamērķi', locationPending:'Gaida GPS…', permissionHelp:'Pārlūka iestatījumos atļauj piekļuvi atrašanās vietai.',
      appVersion:'Lietotnes versija', dataMode:'JSON glabāšana', pwaMode:'PWA instalācija', cacheReady:'Bezsaistes lietotnes pamats gatavs', keepAwakeSetting:'Neizslēgt ekrānu', keepAwakeDescription:'Kamēr go-app ir atvērta, pieprasīt ekrāna Wake Lock.', enabled:'Ieslēgts', disabled:'Izslēgts', resetView:'Atiestatīt kartes skatu', unitsSetting:'Attāluma mērvienības', unitsDescription:'Izvēlies kilometrus vai jūdzes attālumam un ātrumam.', kilometres:'Kilometri', miles:'Jūdzes', unitKm:'km / km/h', unitMiles:'mi / mph', navSearch:'Meklēt', travelMode:'Pārvietošanās veids', car:'Auto', bike:'Velosipēds', walk:'Kājām', namedays:'Vārda dienas', todayNamedays:'Šodienas vārda dienas', weather:'Laikapstākļi', iceWarning:'Iespējams apledojums', snowWarning:'Sniega risks', windWarning:'Stiprs vējš', cameraAhead:'Priekšā ātruma kamera', trafficAhead:'Priekšā satiksmes ziņojums', speedLimit:'Atļautais', overSpeed:'Samazini ātrumu', nearby:'Tuvumā', fuel:'Degviela', parking:'Stāvvieta', priceUnavailable:'Cena nav pieejama', mapStyle:'Kartes stils', roadMap:'Ceļu karte', satellite:'Satelīts', stopAudio:'Apturēt audio', localAudio:'Mans audio', selectAudio:'Izvēlēties MP3 vai audio failus', localFilesNote:'Faili paliek ierīcē un netiek augšupielādēti.', spotify:'Spotify', connectSpotify:'Pievienot Spotify', disconnectSpotify:'Atvienot', proOnly:'Nepieciešams Pro konts', support:'Atbalsts', feedback:'Atsauksme', contactUs:'Sazināties', feedbackCategory:'Ziņojuma veids', message:'Ziņojums', sendMessage:'Nosūtīt ziņojumu', feedbackSent:'Paldies. Ziņojums nosūtīts.', placeSearchTitle:'Meklēt vietas un adreses', searchAllEurope:'Meklē pilsētas, adreses un objektus visā Eiropā', placeDetails:'Vietas informācija', address:'Adrese', postcode:'Pasta indekss', townCity:'Pilsēta / novads', openingHours:'Darba laiks', website:'Tīmekļa vietne', phone:'Tālrunis', navigate:'Navigēt', requestPro:'Pieprasīt Pro piekļuvi', pendingApproval:'Reģistrācija nosūtīta administratora apstiprināšanai.', accountPending:'Konts jāapstiprina pirms pieteikšanās.', mediaRadio:'Radio', mediaFiles:'Mani faili', mediaSpotify:'Spotify', routeRestored:'Iepriekšējais brauciens atjaunots', showNearby:'Rādīt degvielu un stāvvietas', noNearby:'Tuvumā nekas netika atrasts.', stop:'Apturēt', resume:'Turpināt', supportIntro:'Jautājumi vai idejas? Nosūti atsauksmi vai sazinies ar atbalstu.', adminPanel:'Administratora panelis', mapRoadView:'Moderns ceļu skats', mapSatelliteView:'Satelīta skats', selectedPlace:'Izvēlētā vieta', chooseResult:'Izvēlies rezultātu, lai redzētu pilnu adresi un sāktu navigāciju.', alert:'Brīdinājums', cameraDistance:'Kameras attālums', trafficDistance:'Satiksmes attālums'
    },
    ru: {
      brandTagline:'Навигация. Радио. Движение.', heroEyebrow:'Навигация + радио', heroTitle:'Одно быстрое приложение для дороги.',
      heroText:'Стройте маршруты, следуйте по GPS, сообщайте о дорожных проблемах и слушайте радио Латвии, Великобритании или Украины, не выходя из навигации.',
      featureNav:'GPS-навигация', featureRadio:'Радио LV + UK + UA', featureInstall:'Установка на телефон', continueGuest:'Продолжить как гость',
      signIn:'Войти', createAccount:'Создать аккаунт', language:'Язык', navMap:'Карта', navRadio:'Радио', navReports:'События', navProfile:'Профиль',
      currentLocation:'Текущее местоположение', destinationPlaceholder:'Куда едем?', locating:'Определяем местоположение…', search:'Поиск',
      routeReady:'Маршрут готов', routeDistance:'Расстояние', routeTime:'Время в пути', startNavigation:'Начать навигацию', stopNavigation:'Завершить навигацию',
      savePlace:'Сохранить место', route:'Маршрут', recenter:'По центру', zoomIn:'Приблизить', zoomOut:'Отдалить', follow:'Следовать за позицией',
      noRoute:'Выберите пункт назначения, чтобы построить маршрут.', locationDenied:'Для навигации нужен доступ к местоположению.', routeFailed:'Не удалось построить маршрут.',
      searching:'Поиск…', noResults:'Подходящие места не найдены.', countryUK:'Великобритания', countryLV:'Латвия',
      instructionContinue:'Продолжайте по маршруту', instructionArrive:'Вы прибыли', instructionLeft:'Поверните налево', instructionRight:'Поверните направо',
      instructionStraight:'Двигайтесь прямо', instructionRoundabout:'Въезжайте на круг', remaining:'Осталось', eta:'Прибытие', speed:'Скорость',
      rerouting:'Перестраиваем маршрут…', offRoute:'Вы сошли с маршрута', wakeLockOn:'Экран не выключается', wakeLockOff:'Блокировка сна недоступна',
      report:'Сообщить', addReport:'Добавить дорожное событие', reportSubtitle:'Сообщите об актуальной проблеме в вашем местоположении.', reportNote:'Необязательное примечание',
      sendReport:'Отправить', reportSent:'Событие добавлено.', reportTraffic:'Пробка', reportRoadwork:'Дорожные работы', reportHazard:'Опасность',
      reportPolice:'Полиция', reportCamera:'Камера', reportClosure:'Перекрытие', reportsTitle:'Дорожные события', reportsSubtitle:'Свежие сообщения пользователей поблизости.',
      noReports:'Поблизости нет свежих сообщений.', justNow:'Только что', radioTitle:'Онлайн-радио', radioSubtitle:'Главные станции Латвии, Великобритании и Украины.',
      latvia:'Латвия', unitedKingdom:'Великобритания', searchStations:'Поиск станций', noStations:'Станции не найдены.',
      stationsLive:'Свежий каталог станций', stationsCache:'Сохранённый каталог', stationsFallback:'Встроенный список станций',
      connecting:'Подключение…', buffering:'Буферизация…', playing:'В эфире', paused:'Пауза', reconnecting:'Повторное подключение…', connectionFailed:'Поток недоступен',
      radioCacheNote:'Данные станций сохраняются для быстрой загрузки. Для прямого эфира нужен интернет.', radioDirect:'Прямой поток', radioRelay:'Защищённый ретранслятор', radioTapAgain:'Нажмите воспроизведение, чтобы повторить.',
      profileTitle:'Профиль', guestUser:'Гостевой режим', registeredUser:'Зарегистрированный пользователь', account:'Аккаунт', signOut:'Выйти',
      languageSetting:'Язык приложения', installApp:'Установить go-app', installDescription:'Добавьте go-app на главный экран для полноэкранной работы.',
      install:'Установить', installed:'Установлено', installHelp:'Помощь с установкой', iosInstallTitle:'Установка на iPhone или iPad',
      installAndroid:'Установить на Android', installApple:'Установить на Apple', androidBadgeText:'Телефон или планшет Android', appleBadgeText:'iPhone или iPad',
      iosStep1:'Откройте эту страницу в Safari.', iosStep2:'Нажмите кнопку «Поделиться» в Safari.', iosStep3:'Выберите «На экран Домой» и подтвердите.',
      androidInstallTitle:'Установка на Android', androidInstallText:'Нажмите «Установить», когда Chrome предложит. Иначе откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».',
      savedPlaces:'Сохранённые места', noSavedPlaces:'Сохранённых мест пока нет.', placeName:'Название места', save:'Сохранить', saved:'Сохранено.', delete:'Удалить',
      loginTitle:'С возвращением', registerTitle:'Создайте аккаунт', fullName:'Имя и фамилия', email:'Электронная почта', password:'Пароль',
      cancel:'Отмена', submitLogin:'Войти', submitRegister:'Создать аккаунт', accountCreated:'Аккаунт создан. Войдите, чтобы продолжить.',
      loginSuccess:'Вход выполнен.', logoutSuccess:'Вы вышли. Гостевой режим по-прежнему доступен.', profileSync:'Сохранено в аккаунте.',
      guestHint:'Гостевой режим хранит настройки на этом устройстве. Зарегистрируйтесь для синхронизации мест.', online:'В сети', offline:'Нет сети',
      installReady:'go-app готово к установке.', gpsAccuracy:'Точность GPS', routeAlternatives:'Варианты маршрута', fastest:'Быстрее всего',
      close:'Закрыть', retry:'Повторить', loading:'Загрузка…', unknownError:'Что-то пошло не так.', usePlace:'Ехать сюда',
      radioRetrying:'Пробуем другой поток', stationCount:'станций', reportLocation:'Будет использована текущая GPS-позиция.',
      chooseType:'Выберите тип события', saveDestination:'Сохранить пункт назначения', locationPending:'Ожидание GPS…', permissionHelp:'Разрешите доступ к геолокации в настройках браузера.',
      appVersion:'Версия приложения', dataMode:'Хранение JSON', pwaMode:'Установка PWA', cacheReady:'Офлайн-оболочка готова', keepAwakeSetting:'Не выключать экран', keepAwakeDescription:'Запрашивать Wake Lock, пока go-app открыто.', enabled:'Вкл.', disabled:'Выкл.', resetView:'Сбросить вид карты', unitsSetting:'Единицы расстояния', unitsDescription:'Выберите километры или мили для расстояния и скорости.', kilometres:'Километры', miles:'Мили', unitKm:'км / км/ч', unitMiles:'ми / миль/ч', navSearch:'Поиск', travelMode:'Режим движения', car:'Автомобиль', bike:'Велосипед', walk:'Пешком', namedays:'Именины', todayNamedays:'Именины сегодня', weather:'Погода', iceWarning:'Возможен гололёд', snowWarning:'Риск снега', windWarning:'Сильный ветер', cameraAhead:'Впереди камера скорости', trafficAhead:'Впереди сообщение о пробке', speedLimit:'Ограничение', overSpeed:'Снизьте скорость', nearby:'Рядом', fuel:'Заправка', parking:'Парковка', priceUnavailable:'Цена недоступна', mapStyle:'Стиль карты', roadMap:'Дороги', satellite:'Спутник', stopAudio:'Остановить аудио', localAudio:'Моё аудио', selectAudio:'Выбрать MP3 или аудиофайлы', localFilesNote:'Файлы остаются на устройстве и не загружаются.', spotify:'Spotify', connectSpotify:'Подключить Spotify', disconnectSpotify:'Отключить', proOnly:'Требуется Pro-аккаунт', support:'Поддержка', feedback:'Отзыв', contactUs:'Связаться', feedbackCategory:'Тип сообщения', message:'Сообщение', sendMessage:'Отправить', feedbackSent:'Спасибо. Сообщение отправлено.', placeSearchTitle:'Поиск мест и адресов', searchAllEurope:'Ищите города, адреса и объекты по всей Европе', placeDetails:'Информация о месте', address:'Адрес', postcode:'Почтовый индекс', townCity:'Город', openingHours:'Часы работы', website:'Сайт', phone:'Телефон', navigate:'Навигация', requestPro:'Запросить Pro-доступ', pendingApproval:'Регистрация отправлена на одобрение администратора.', accountPending:'Аккаунт должен быть одобрен перед входом.', mediaRadio:'Радио', mediaFiles:'Мои файлы', mediaSpotify:'Spotify', routeRestored:'Предыдущая поездка восстановлена', showNearby:'Показывать АЗС и парковки', noNearby:'Рядом ничего не найдено.', stop:'Стоп', resume:'Продолжить', supportIntro:'Есть вопросы или идеи? Отправьте отзыв или свяжитесь с поддержкой.', adminPanel:'Панель администратора', mapRoadView:'Современная дорожная карта', mapSatelliteView:'Спутниковая карта', selectedPlace:'Выбранное место', chooseResult:'Выберите результат, чтобы увидеть полный адрес и начать навигацию.', alert:'Предупреждение', cameraDistance:'Расстояние до камеры', trafficDistance:'Расстояние до пробки'
    }
  };

  Object.assign(I18N.en, {"ukraine":"Ukraine","europe":"Europe","selectCountry":"Search country","serviceAreas":"Service areas","showServiceAreas":"Show service areas and alerts","serviceSoon":"Service area ahead","serviceArea":"Service area","homePromotion":"Featured","learnMore":"Learn more","closeAd":"Dismiss promotion","adFreePro":"Pro users browse without ads"});
  Object.assign(I18N.lv, {"ukraine":"Ukraina","europe":"Eiropa","selectCountry":"Meklēšanas valsts","serviceAreas":"Atpūtas un servisa zonas","showServiceAreas":"Rādīt servisa zonas un brīdinājumus","serviceSoon":"Priekšā servisa zona","serviceArea":"Servisa zona","homePromotion":"Ieteikums","learnMore":"Uzzināt vairāk","closeAd":"Aizvērt reklāmu","adFreePro":"Pro lietotājiem bez reklāmām"});
  Object.assign(I18N.ru, {"ukraine":"Украина","europe":"Европа","selectCountry":"Страна поиска","serviceAreas":"Зоны отдыха и сервиса","showServiceAreas":"Показывать сервисные зоны и предупреждения","serviceSoon":"Впереди сервисная зона","serviceArea":"Сервисная зона","homePromotion":"Рекомендуем","learnMore":"Подробнее","closeAd":"Закрыть рекламу","adFreePro":"Для Pro без рекламы"});
  I18N.uk = Object.assign({}, I18N.en, {"brandTagline":"Навігація. Радіо. Рухайтесь далі.","heroEyebrow":"Навігація + онлайн-радіо","heroTitle":"Один швидкий застосунок для дороги.","heroText":"Плануйте маршрути, стежте за GPS, отримуйте попередження та слухайте радіо, не залишаючи навігацію.","featureNav":"Жива навігація","featureRadio":"Радіо Європи","featureInstall":"Встановлюваний застосунок","continueGuest":"Продовжити як гість","signIn":"Увійти","createAccount":"Створити обліковий запис","language":"Мова","navMap":"Карта","navSearch":"Пошук","navRadio":"Радіо","navReports":"Повідомлення","navProfile":"Профіль","destinationPlaceholder":"Куди прямуєте?","search":"Пошук","routeReady":"Маршрут готовий","routeDistance":"Відстань","routeTime":"Час у дорозі","startNavigation":"Почати навігацію","stopNavigation":"Завершити навігацію","zoomIn":"Збільшити","zoomOut":"Зменшити","follow":"Стежити за місцем","resetView":"Скинути вигляд карти","travelMode":"Спосіб пересування","car":"Авто","bike":"Велосипед","walk":"Пішки","weather":"Погода","radioTitle":"Онлайн-радіо","radioSubtitle":"Основні станції Латвії, Великої Британії та України.","latvia":"Латвія","unitedKingdom":"Велика Британія","ukraine":"Україна","searchStations":"Пошук станцій","profileTitle":"Профіль","languageSetting":"Мова застосунку","unitsSetting":"Одиниці відстані","kilometres":"Кілометри","miles":"Милі","mapStyle":"Стиль карти","roadMap":"Дороги","satellite":"Супутник","showNearby":"Показувати АЗС і паркінги","serviceAreas":"Сервісні зони","showServiceAreas":"Показувати сервісні зони та попередження","serviceSoon":"Попереду сервісна зона","serviceArea":"Сервісна зона","europe":"Європа","selectCountry":"Країна пошуку","homePromotion":"Рекомендовано","learnMore":"Дізнатися більше","closeAd":"Закрити рекламу","adFreePro":"Без реклами для Pro","support":"Підтримка","contactUs":"Зв’язатися","sendMessage":"Надіслати","nearby":"Поруч","fuel":"АЗС","parking":"Паркінг","cameraAhead":"Попереду камера швидкості","trafficAhead":"Попереду затор","overSpeed":"Зменште швидкість","remaining":"Залишилось","eta":"Прибуття","speed":"Швидкість","enabled":"Увімкнено","disabled":"Вимкнено","installApp":"Встановити go-app","localAudio":"Моє аудіо","stopAudio":"Зупинити аудіо","mediaRadio":"Радіо","mediaFiles":"Мої файли","mediaSpotify":"Spotify","savedPlaces":"Збережені місця","account":"Обліковий запис","signOut":"Вийти","loading":"Завантаження…","searchAllEurope":"Шукайте міста, адреси та об’єкти по всій Європі","navigate":"Навігація","placeSearchTitle":"Пошук місць і адрес"});
  I18N.pl = Object.assign({}, I18N.en, {"brandTagline":"Nawiguj. Słuchaj. Jedź dalej.","heroTitle":"Jedna szybka aplikacja na drogę.","continueGuest":"Kontynuuj jako gość","signIn":"Zaloguj się","createAccount":"Utwórz konto","language":"Język","navMap":"Mapa","navSearch":"Szukaj","navRadio":"Radio","navReports":"Zgłoszenia","navProfile":"Profil","destinationPlaceholder":"Dokąd jedziesz?","search":"Szukaj","routeReady":"Trasa gotowa","startNavigation":"Rozpocznij nawigację","stopNavigation":"Zakończ nawigację","zoomIn":"Powiększ","zoomOut":"Pomniejsz","follow":"Śledź położenie","resetView":"Resetuj widok","travelMode":"Tryb podróży","car":"Samochód","bike":"Rower","walk":"Pieszo","radioTitle":"Radio na żywo","latvia":"Łotwa","unitedKingdom":"Wielka Brytania","ukraine":"Ukraina","profileTitle":"Profil","unitsSetting":"Jednostki odległości","kilometres":"Kilometry","miles":"Mile","serviceAreas":"Miejsca obsługi podróżnych","showServiceAreas":"Pokaż usługi i ostrzeżenia","serviceSoon":"Miejsce obsługi wkrótce","europe":"Europa","selectCountry":"Kraj wyszukiwania","learnMore":"Dowiedz się więcej","homePromotion":"Polecane"});
  I18N.de = Object.assign({}, I18N.en, {"brandTagline":"Navigieren. Hören. Weiterfahren.","heroTitle":"Eine schnelle App für unterwegs.","continueGuest":"Als Gast fortfahren","signIn":"Anmelden","createAccount":"Konto erstellen","language":"Sprache","navMap":"Karte","navSearch":"Suche","navRadio":"Radio","navReports":"Meldungen","navProfile":"Profil","destinationPlaceholder":"Wohin geht es?","search":"Suchen","routeReady":"Route bereit","startNavigation":"Navigation starten","stopNavigation":"Navigation beenden","zoomIn":"Vergrößern","zoomOut":"Verkleinern","follow":"Standort folgen","resetView":"Kartenansicht zurücksetzen","travelMode":"Reisemodus","car":"Auto","bike":"Fahrrad","walk":"Zu Fuß","radioTitle":"Live-Radio","latvia":"Lettland","unitedKingdom":"Vereinigtes Königreich","ukraine":"Ukraine","profileTitle":"Profil","unitsSetting":"Entfernungseinheiten","kilometres":"Kilometer","miles":"Meilen","serviceAreas":"Rast- und Serviceplätze","showServiceAreas":"Serviceplätze und Hinweise anzeigen","serviceSoon":"Serviceplatz voraus","europe":"Europa","selectCountry":"Suchland","learnMore":"Mehr erfahren","homePromotion":"Empfohlen"});
  I18N.lt = Object.assign({}, I18N.en, {"brandTagline":"Naviguokite. Klausykite. Judėkite.","heroTitle":"Viena greita programėlė kelionei.","continueGuest":"Tęsti kaip svečiui","signIn":"Prisijungti","createAccount":"Sukurti paskyrą","language":"Kalba","navMap":"Žemėlapis","navSearch":"Paieška","navRadio":"Radijas","navReports":"Pranešimai","navProfile":"Profilis","destinationPlaceholder":"Kur vykstate?","search":"Ieškoti","routeReady":"Maršrutas paruoštas","startNavigation":"Pradėti navigaciją","stopNavigation":"Baigti navigaciją","zoomIn":"Priartinti","zoomOut":"Atitolinti","follow":"Sekti vietą","resetView":"Atkurti žemėlapio vaizdą","travelMode":"Kelionės būdas","car":"Automobilis","bike":"Dviratis","walk":"Pėsčiomis","radioTitle":"Tiesioginis radijas","latvia":"Latvija","unitedKingdom":"Jungtinė Karalystė","ukraine":"Ukraina","profileTitle":"Profilis","unitsSetting":"Atstumo vienetai","kilometres":"Kilometrai","miles":"Mylios","serviceAreas":"Poilsio ir paslaugų zonos","showServiceAreas":"Rodyti paslaugų zonas ir įspėjimus","serviceSoon":"Netrukus paslaugų zona","europe":"Europa","selectCountry":"Paieškos šalis","learnMore":"Sužinoti daugiau","homePromotion":"Rekomenduojama"});
  I18N.et = Object.assign({}, I18N.en, {"brandTagline":"Navigeeri. Kuula. Liigu edasi.","heroTitle":"Üks kiire rakendus teele.","continueGuest":"Jätka külalisena","signIn":"Logi sisse","createAccount":"Loo konto","language":"Keel","navMap":"Kaart","navSearch":"Otsing","navRadio":"Raadio","navReports":"Teated","navProfile":"Profiil","destinationPlaceholder":"Kuhu sõidad?","search":"Otsi","routeReady":"Marsruut valmis","startNavigation":"Alusta navigeerimist","stopNavigation":"Lõpeta navigeerimine","zoomIn":"Suurenda","zoomOut":"Vähenda","follow":"Jälgi asukohta","resetView":"Lähtesta kaardivaade","travelMode":"Liikumisviis","car":"Auto","bike":"Jalgratas","walk":"Jalgsi","radioTitle":"Otseraadio","latvia":"Läti","unitedKingdom":"Ühendkuningriik","ukraine":"Ukraina","profileTitle":"Profiil","unitsSetting":"Kaugusühikud","kilometres":"Kilomeetrid","miles":"Miilid","serviceAreas":"Teenindus- ja puhkealad","showServiceAreas":"Näita teenindusalasid ja hoiatusi","serviceSoon":"Teenindusala ees","europe":"Euroopa","selectCountry":"Otsingu riik","learnMore":"Loe lähemalt","homePromotion":"Soovitatud"});
  I18N.sv = Object.assign({}, I18N.en, {"brandTagline":"Navigera. Lyssna. Fortsätt.","heroTitle":"En snabb app för vägen.","continueGuest":"Fortsätt som gäst","signIn":"Logga in","createAccount":"Skapa konto","language":"Språk","navMap":"Karta","navSearch":"Sök","navRadio":"Radio","navReports":"Rapporter","navProfile":"Profil","destinationPlaceholder":"Vart ska du?","search":"Sök","routeReady":"Rutten är klar","startNavigation":"Starta navigation","stopNavigation":"Avsluta navigation","zoomIn":"Zooma in","zoomOut":"Zooma ut","follow":"Följ position","resetView":"Återställ kartvy","travelMode":"Färdsätt","car":"Bil","bike":"Cykel","walk":"Gång","radioTitle":"Direktradio","latvia":"Lettland","unitedKingdom":"Storbritannien","ukraine":"Ukraina","profileTitle":"Profil","unitsSetting":"Avståndsenheter","kilometres":"Kilometer","miles":"Miles","serviceAreas":"Rast- och serviceplatser","showServiceAreas":"Visa serviceplatser och varningar","serviceSoon":"Serviceplats snart","europe":"Europa","selectCountry":"Sökland","learnMore":"Läs mer","homePromotion":"Utvalt"});
  I18N.no = Object.assign({}, I18N.en, {"brandTagline":"Naviger. Lytt. Kjør videre.","heroTitle":"Én rask app for veien.","continueGuest":"Fortsett som gjest","signIn":"Logg inn","createAccount":"Opprett konto","language":"Språk","navMap":"Kart","navSearch":"Søk","navRadio":"Radio","navReports":"Rapporter","navProfile":"Profil","destinationPlaceholder":"Hvor skal du?","search":"Søk","routeReady":"Ruten er klar","startNavigation":"Start navigasjon","stopNavigation":"Avslutt navigasjon","zoomIn":"Zoom inn","zoomOut":"Zoom ut","follow":"Følg posisjon","resetView":"Tilbakestill kartvisning","travelMode":"Reisemåte","car":"Bil","bike":"Sykkel","walk":"Gange","radioTitle":"Direkteradio","latvia":"Latvia","unitedKingdom":"Storbritannia","ukraine":"Ukraina","profileTitle":"Profil","unitsSetting":"Avstandsenheter","kilometres":"Kilometer","miles":"Miles","serviceAreas":"Raste- og serviceplasser","showServiceAreas":"Vis serviceplasser og varsler","serviceSoon":"Serviceplass snart","europe":"Europa","selectCountry":"Søkland","learnMore":"Les mer","homePromotion":"Fremhevet"});
  I18N.da = Object.assign({}, I18N.en, {"brandTagline":"Navigér. Lyt. Kør videre.","heroTitle":"Én hurtig app til vejen.","continueGuest":"Fortsæt som gæst","signIn":"Log ind","createAccount":"Opret konto","language":"Sprog","navMap":"Kort","navSearch":"Søg","navRadio":"Radio","navReports":"Rapporter","navProfile":"Profil","destinationPlaceholder":"Hvor skal du hen?","search":"Søg","routeReady":"Ruten er klar","startNavigation":"Start navigation","stopNavigation":"Afslut navigation","zoomIn":"Zoom ind","zoomOut":"Zoom ud","follow":"Følg position","resetView":"Nulstil kortvisning","travelMode":"Rejsemåde","car":"Bil","bike":"Cykel","walk":"Gang","radioTitle":"Live radio","latvia":"Letland","unitedKingdom":"Storbritannien","ukraine":"Ukraine","profileTitle":"Profil","unitsSetting":"Afstandsenheder","kilometres":"Kilometer","miles":"Miles","serviceAreas":"Raste- og servicepladser","showServiceAreas":"Vis servicepladser og advarsler","serviceSoon":"Serviceplads forude","europe":"Europa","selectCountry":"Søgeland","learnMore":"Læs mere","homePromotion":"Udvalgt"});
  I18N.fi = Object.assign({}, I18N.en, {"brandTagline":"Navigoi. Kuuntele. Jatka matkaa.","heroTitle":"Yksi nopea sovellus tielle.","continueGuest":"Jatka vieraana","signIn":"Kirjaudu","createAccount":"Luo tili","language":"Kieli","navMap":"Kartta","navSearch":"Haku","navRadio":"Radio","navReports":"Ilmoitukset","navProfile":"Profiili","destinationPlaceholder":"Minne olet menossa?","search":"Hae","routeReady":"Reitti valmis","startNavigation":"Aloita navigointi","stopNavigation":"Lopeta navigointi","zoomIn":"Lähennä","zoomOut":"Loitonna","follow":"Seuraa sijaintia","resetView":"Palauta karttanäkymä","travelMode":"Matkatapa","car":"Auto","bike":"Polkupyörä","walk":"Kävellen","radioTitle":"Suora radio","latvia":"Latvia","unitedKingdom":"Yhdistynyt kuningaskunta","ukraine":"Ukraina","profileTitle":"Profiili","unitsSetting":"Etäisyysyksiköt","kilometres":"Kilometrit","miles":"Mailit","serviceAreas":"Palvelu- ja levähdysalueet","showServiceAreas":"Näytä palvelualueet ja varoitukset","serviceSoon":"Palvelualue edessä","europe":"Eurooppa","selectCountry":"Hakumaa","learnMore":"Lue lisää","homePromotion":"Suositeltu"});

  Object.assign(I18N.en,{allEurope:'All Europe',europeanUnion:'European Union',balticStates:'Baltic states',nordicCountries:'Nordic & Scandinavia',quickRegions:'Regions',euCountries:'EU countries',otherEurope:'Other European countries',europeCoverage:'Europe-wide map and routing'});
  Object.assign(I18N.lv,{allEurope:'Visa Eiropa',europeanUnion:'Eiropas Savienība',balticStates:'Baltijas valstis',nordicCountries:'Ziemeļvalstis un Skandināvija',quickRegions:'Reģioni',euCountries:'ES valstis',otherEurope:'Citas Eiropas valstis',europeCoverage:'Karte un maršruti visā Eiropā'});
  Object.assign(I18N.ru,{allEurope:'Вся Европа',europeanUnion:'Европейский союз',balticStates:'Страны Балтии',nordicCountries:'Северные страны и Скандинавия',quickRegions:'Регионы',euCountries:'Страны ЕС',otherEurope:'Другие страны Европы',europeCoverage:'Карта и маршруты по всей Европе'});
  Object.assign(I18N.uk,{allEurope:'Уся Європа',europeanUnion:'Європейський Союз',balticStates:'Країни Балтії',nordicCountries:'Північні країни та Скандинавія',quickRegions:'Регіони',euCountries:'Країни ЄС',otherEurope:'Інші країни Європи',europeCoverage:'Карта й маршрути по всій Європі'});
  Object.assign(I18N.pl,{allEurope:'Cała Europa',europeanUnion:'Unia Europejska',balticStates:'Kraje bałtyckie',nordicCountries:'Kraje nordyckie i Skandynawia',quickRegions:'Regiony',euCountries:'Kraje UE',otherEurope:'Pozostałe kraje Europy',europeCoverage:'Mapa i trasy w całej Europie'});
  Object.assign(I18N.de,{allEurope:'Ganz Europa',europeanUnion:'Europäische Union',balticStates:'Baltische Staaten',nordicCountries:'Nordische Länder und Skandinavien',quickRegions:'Regionen',euCountries:'EU-Länder',otherEurope:'Weitere europäische Länder',europeCoverage:'Europaweite Karte und Routen'});
  Object.assign(I18N.lt,{allEurope:'Visa Europa',europeanUnion:'Europos Sąjunga',balticStates:'Baltijos šalys',nordicCountries:'Šiaurės šalys ir Skandinavija',quickRegions:'Regionai',euCountries:'ES šalys',otherEurope:'Kitos Europos šalys',europeCoverage:'Visos Europos žemėlapis ir maršrutai'});
  Object.assign(I18N.et,{allEurope:'Kogu Euroopa',europeanUnion:'Euroopa Liit',balticStates:'Balti riigid',nordicCountries:'Põhjamaad ja Skandinaavia',quickRegions:'Piirkonnad',euCountries:'ELi riigid',otherEurope:'Muud Euroopa riigid',europeCoverage:'Üleeuroopaline kaart ja marsruudid'});
  Object.assign(I18N.sv,{allEurope:'Hela Europa',europeanUnion:'Europeiska unionen',balticStates:'Baltikum',nordicCountries:'Norden och Skandinavien',quickRegions:'Regioner',euCountries:'EU-länder',otherEurope:'Övriga europeiska länder',europeCoverage:'Karta och rutter i hela Europa'});
  Object.assign(I18N.no,{allEurope:'Hele Europa',europeanUnion:'Den europeiske union',balticStates:'De baltiske landene',nordicCountries:'Norden og Skandinavia',quickRegions:'Regioner',euCountries:'EU-land',otherEurope:'Andre europeiske land',europeCoverage:'Kart og ruter i hele Europa'});
  Object.assign(I18N.da,{allEurope:'Hele Europa',europeanUnion:'Den Europæiske Union',balticStates:'De baltiske lande',nordicCountries:'Norden og Skandinavien',quickRegions:'Regioner',euCountries:'EU-lande',otherEurope:'Andre europæiske lande',europeCoverage:'Kort og ruter i hele Europa'});
  Object.assign(I18N.fi,{allEurope:'Koko Eurooppa',europeanUnion:'Euroopan unioni',balticStates:'Baltian maat',nordicCountries:'Pohjoismaat ja Skandinavia',quickRegions:'Alueet',euCountries:'EU-maat',otherEurope:'Muut Euroopan maat',europeCoverage:'Koko Euroopan kartta ja reitit'});

  Object.assign(I18N.en,{appearance:'Appearance',themeDescription:'Choose a fixed day or night appearance. Day is the default.',dayMode:'Day',nightMode:'Night',backToSearch:'Back to search',backToMap:'Back to map',adminLogin:'Admin login',adminLoginDescription:'hCaptcha · SMTP · cache · users · approvals',allowRotation:'Screen orientation',rotationReady:'Automatic portrait and landscape layout',rotateScreen:'Rotate screen',rotationUnavailable:'Rotation is controlled by Android. Enable Auto-rotate or install/open go-app as an app.',todaysNamedays:'Today’s namedays'});
  Object.assign(I18N.lv,{appearance:'Izskats',themeDescription:'Izvēlies pastāvīgu dienas vai nakts režīmu. Noklusējums ir dienas režīms.',dayMode:'Diena',nightMode:'Nakts',backToSearch:'Atpakaļ uz meklēšanu',backToMap:'Atpakaļ uz karti',adminLogin:'Administratora pieteikšanās',adminLoginDescription:'hCaptcha · SMTP · kešatmiņa · lietotāji · apstiprinājumi',allowRotation:'Ekrāna orientācija',rotationReady:'Automātisks portreta un ainavas izkārtojums',rotateScreen:'Pagriezt ekrānu',rotationUnavailable:'Ekrāna pagriešanu kontrolē Android. Ieslēdz automātisko pagriešanu vai atver instalēto go-app.',todaysNamedays:'Šodienas vārda dienas'});
  Object.assign(I18N.ru,{appearance:'Оформление',themeDescription:'Выберите постоянный дневной или ночной режим. По умолчанию включён дневной.',dayMode:'День',nightMode:'Ночь',backToSearch:'Назад к поиску',backToMap:'Назад к карте',adminLogin:'Вход администратора',adminLoginDescription:'hCaptcha · SMTP · кэш · пользователи · одобрения',allowRotation:'Ориентация экрана',rotationReady:'Автоматическая портретная и альбомная компоновка',rotateScreen:'Повернуть экран',rotationUnavailable:'Поворот контролируется Android. Включите автоповорот или откройте установленное приложение go-app.',todaysNamedays:'Сегодняшние именины'});


  Object.assign(I18N.en,{subscribeNews:'Subscribe to news',newsletterTitle:'go-app news and updates',newsletterText:'Receive occasional product news, service notices and go-app update information.',newsletterConsent:'I agree to receive go-app news by email',newsletterPrivacy:'You can unsubscribe from every message.',subscribe:'Subscribe',newsletterSaved:'Subscription saved.',searchMinimum:'Enter at least two characters.'});
  Object.assign(I18N.lv,{subscribeNews:'Abonēt jaunumus',newsletterTitle:'go-app jaunumi un atjauninājumi',newsletterText:'Saņem neregulārus produktu jaunumus, pakalpojumu paziņojumus un go-app atjauninājumus.',newsletterConsent:'Piekrītu saņemt go-app jaunumus e-pastā',newsletterPrivacy:'No jaunumiem var atteikties katrā ziņojumā.',subscribe:'Abonēt',newsletterSaved:'Abonements saglabāts.',searchMinimum:'Ievadi vismaz divas rakstzīmes.'});
  Object.assign(I18N.ru,{subscribeNews:'Подписаться на новости',newsletterTitle:'Новости и обновления go-app',newsletterText:'Получайте новости продуктов, уведомления сервиса и информацию об обновлениях go-app.',newsletterConsent:'Я согласен получать новости go-app по электронной почте',newsletterPrivacy:'Отписаться можно из каждого письма.',subscribe:'Подписаться',newsletterSaved:'Подписка сохранена.',searchMinimum:'Введите не менее двух символов.'});

  Object.assign(I18N.en,{exitHome:'Exit to home',exitSearch:'Exit to search',exitNavigation:'Exit navigation'});
  Object.assign(I18N.lv,{exitHome:'Uz sākuma ekrānu',exitSearch:'Uz meklēšanu',exitNavigation:'Iziet no navigācijas'});
  Object.assign(I18N.ru,{exitHome:'На главный экран',exitSearch:'К поиску',exitNavigation:'Выйти из навигации'});
  Object.assign(I18N.uk,{exitHome:'На головний екран',exitSearch:'До пошуку',exitNavigation:'Вийти з навігації'});

  Object.assign(I18N.en,{privacyTitle:'Local-first and private',privacyText:'Your live location is used only for navigation and nearby results. go-app does not add advertising trackers or build a movement history. Optional account, feedback and newsletter data is sent only when you submit it.',batterySmart:'Battery-smart',batterySmartText:'Effects and background updates are reduced automatically on older or data-saver devices.',localResults:'Local results',localResultsText:'Nearby weather, transport and parking are requested only when you use those features.',noTracking:'No advertising tracking',wikipedia:'Wikipedia',photos:'Photos',webSearch:'Web search',openMap:'Open map',externalResources:'About this place',arrivalTitle:'You have arrived',arrivalBody:'You reached your destination.',currentSpeed:'Now',allowedSpeed:'Limit',publicTransport:'Public transport',publicTransportInfo:'Nearby stops and a public-transport route are available while walking.',openTransit:'Open transit route',nearbyStops:'Nearby stops',navParking:'Parking',parkingTitle:'Parking near me',parkingSubtitle:'Find free or lower-cost public parking and start navigation.',freeParking:'Free',cheapParking:'Low cost',allParking:'All',free:'Free',lowCost:'Low cost',paid:'Paid',unknownFee:'Fee unknown',noParking:'No matching parking places found nearby.',refreshNearby:'Refresh nearby',cyclingRecommended:'Recommended cycling route',cyclingNote:'Bicycle routing prioritises roads available to cycling; always follow local signs and conditions.',routeOption:'Route',rainNow:'Rain',dryNow:'No rain'});
  Object.assign(I18N.lv,{privacyTitle:'Lokāli un privāti',privacyText:'Tava atrašanās vieta tiek izmantota tikai navigācijai un tuvākajiem rezultātiem. go-app nepievieno reklāmu izsekotājus un neveido pārvietošanās vēsturi. Konta, atsauksmju un jaunumu dati tiek nosūtīti tikai tad, kad tos iesniedz.',batterySmart:'Saudzē akumulatoru',batterySmartText:'Vecākās ierīcēs un datu taupīšanas režīmā efekti un fona atjauninājumi tiek samazināti automātiski.',localResults:'Vietējie rezultāti',localResultsText:'Laikapstākļi, transports un stāvvietas tiek pieprasītas tikai tad, kad izmanto šīs funkcijas.',noTracking:'Bez reklāmu izsekošanas',wikipedia:'Wikipedia',photos:'Fotoattēli',webSearch:'Meklēt tīmeklī',openMap:'Atvērt karti',externalResources:'Par šo vietu',arrivalTitle:'Tu esi ieradies',arrivalBody:'Galamērķis ir sasniegts.',currentSpeed:'Tagad',allowedSpeed:'Atļauts',publicTransport:'Sabiedriskais transports',publicTransportInfo:'Ejot kājām, redzami tuvākie pieturas punkti un sabiedriskā transporta maršruta saite.',openTransit:'Atvērt transporta maršrutu',nearbyStops:'Tuvākās pieturas',navParking:'Stāvvietas',parkingTitle:'Stāvvietas tuvumā',parkingSubtitle:'Atrodi bezmaksas vai lētākas publiskās stāvvietas un sāc navigāciju.',freeParking:'Bezmaksas',cheapParking:'Lētākas',allParking:'Visas',free:'Bezmaksas',lowCost:'Lēta',paid:'Maksas',unknownFee:'Maksa nav zināma',noParking:'Tuvumā nav atrasta atbilstoša stāvvieta.',refreshNearby:'Atjaunot tuvumā',cyclingRecommended:'Ieteiktais velo maršruts',cyclingNote:'Velo maršrutēšana izmanto velosipēdiem pieejamus ceļus; vienmēr ievēro zīmes un apstākļus.',routeOption:'Maršruts',rainNow:'Līst',dryNow:'Bez lietus'});
  Object.assign(I18N.ru,{privacyTitle:'Локально и конфиденциально',privacyText:'Текущее местоположение используется только для навигации и ближайших результатов. go-app не добавляет рекламные трекеры и не создаёт историю перемещений. Данные аккаунта, обратной связи и рассылки отправляются только после вашей отправки.',batterySmart:'Экономия батареи',batterySmartText:'На старых устройствах и при экономии трафика эффекты и фоновые обновления автоматически сокращаются.',localResults:'Местные результаты',localResultsText:'Погода, транспорт и парковки запрашиваются только при использовании этих функций.',noTracking:'Без рекламного отслеживания',wikipedia:'Википедия',photos:'Фото',webSearch:'Поиск в интернете',openMap:'Открыть карту',externalResources:'О месте',arrivalTitle:'Вы прибыли',arrivalBody:'Пункт назначения достигнут.',currentSpeed:'Сейчас',allowedSpeed:'Лимит',publicTransport:'Общественный транспорт',publicTransportInfo:'В пешем режиме показаны ближайшие остановки и ссылка на маршрут общественного транспорта.',openTransit:'Открыть маршрут',nearbyStops:'Ближайшие остановки',navParking:'Парковка',parkingTitle:'Парковка рядом',parkingSubtitle:'Найдите бесплатную или недорогую общественную парковку и начните навигацию.',freeParking:'Бесплатно',cheapParking:'Недорого',allParking:'Все',free:'Бесплатно',lowCost:'Недорого',paid:'Платно',unknownFee:'Цена неизвестна',noParking:'Подходящих парковок поблизости не найдено.',refreshNearby:'Обновить',cyclingRecommended:'Рекомендуемый веломаршрут',cyclingNote:'Веломаршрутизация использует доступные для велосипедов дороги; соблюдайте знаки и условия.',routeOption:'Маршрут',rainNow:'Дождь',dryNow:'Без дождя'});
  Object.assign(I18N.uk,{privacyTitle:'Локально та приватно',privacyText:'Поточне місцезнаходження використовується лише для навігації та результатів поруч. go-app не додає рекламних трекерів і не створює історію пересувань. Дані облікового запису, відгуків і розсилки надсилаються лише після вашого підтвердження.',batterySmart:'Економія батареї',batterySmartText:'На старіших пристроях і в режимі економії даних ефекти та фонові оновлення автоматично зменшуються.',localResults:'Місцеві результати',localResultsText:'Погода, транспорт і паркінги запитуються лише коли ви користуєтеся цими функціями.',noTracking:'Без рекламного відстеження',wikipedia:'Вікіпедія',photos:'Фото',webSearch:'Пошук у мережі',openMap:'Відкрити карту',externalResources:'Про місце',arrivalTitle:'Ви прибули',arrivalBody:'Пункт призначення досягнуто.',currentSpeed:'Зараз',allowedSpeed:'Ліміт',publicTransport:'Громадський транспорт',publicTransportInfo:'У пішому режимі показано найближчі зупинки та посилання на маршрут громадського транспорту.',openTransit:'Відкрити маршрут',nearbyStops:'Найближчі зупинки',navParking:'Паркінг',parkingTitle:'Паркінг поруч',parkingSubtitle:'Знайдіть безкоштовний або недорогий громадський паркінг і почніть навігацію.',freeParking:'Безкоштовно',cheapParking:'Недорого',allParking:'Усі',free:'Безкоштовно',lowCost:'Недорого',paid:'Платно',unknownFee:'Ціна невідома',noParking:'Поруч не знайдено відповідних паркінгів.',refreshNearby:'Оновити',cyclingRecommended:'Рекомендований веломаршрут',cyclingNote:'Веломаршрутизація використовує дороги, доступні для велосипедів; дотримуйтеся знаків і умов.',routeOption:'Маршрут',rainNow:'Дощ',dryNow:'Без дощу'});

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function unique(values) { return values.filter(function (value, index) { return value && values.indexOf(value) === index; }); }
  function escapeText(value) { return String(value == null ? '' : value); }
  function initials(name) { return String(name || 'GO').split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase(); }
  function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function guestId() {
    var value = localStorage.getItem('go-app-guest-id');
    if (!value) { value = 'GST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('go-app-guest-id', value); }
    return value;
  }
  function formatDistance(metres, lang, units) {
    if (!isFinite(metres)) return '—';
    metres = Math.max(0, metres);
    if (units === 'mi') {
      var miles = metres / 1609.344;
      if (miles >= 0.1) return new Intl.NumberFormat(lang, {maximumFractionDigits:miles >= 10 ? 0 : 1}).format(miles) + ' mi';
      return Math.round(metres * 3.28084) + ' ft';
    }
    if (metres >= 1000) return new Intl.NumberFormat(lang, {maximumFractionDigits:metres >= 10000 ? 0 : 1}).format(metres / 1000) + ' km';
    return Math.round(metres) + ' m';
  }
  function formatSpeed(metresPerSecond, units) {
    var value = isFinite(metresPerSecond) ? Math.max(0, metresPerSecond) : 0;
    if (units === 'mi') return {value:Math.round(value * 2.236936), label:'mph'};
    return {value:Math.round(value * 3.6), label:'km/h'};
  }
  function weatherVisual(weather) {
    var code = Number(weather && weather.weatherCode || 0), wet = Number(weather && (weather.rain || weather.precipitation) || 0) > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    var icon = code === 0 ? '☀' : code <= 3 ? '⛅' : code <= 48 ? '🌫' : code <= 67 ? '🌧' : code <= 77 ? '❄' : code <= 82 ? '🌦' : code <= 86 ? '🌨' : code >= 95 ? '⛈' : '☁';
    return {icon:icon, wet:wet, temperature:Math.round(Number(weather && weather.temperature || 0))};
  }
  function placeQuery(place) {
    return [safePlaceText(place && (place.title || place.name)), safePlaceText(place && (place.city || place.country))].filter(Boolean).join(' ') || safePlaceText(place && (place.label || place.address)) || 'place';
  }
  function wikipediaUrl(place, lang) {
    var tag = safePlaceText(place && place.wikipedia), code = safePlaceText(lang || 'en').toLowerCase();
    if (tag && tag.indexOf(':') > 0) {
      var parts = tag.split(':'), wikiCode = parts.shift().toLowerCase(), title = parts.join(':');
      if (/^[a-z-]{2,12}$/.test(wikiCode) && title) return 'https://' + wikiCode + '.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g,'_'));
    }
    if (!/^[a-z-]{2,12}$/.test(code)) code = 'en';
    return 'https://' + code + '.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(placeQuery(place));
  }
  function photoSearchUrl(place) {
    return 'https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=' + encodeURIComponent(placeQuery(place));
  }
  function webSearchUrl(place) {
    return 'https://duckduckgo.com/?q=' + encodeURIComponent(placeQuery(place));
  }
  function mapResourceUrl(place) {
    var type = safePlaceText(place && place.osmType).toLowerCase(), id = safePlaceText(place && place.osmId);
    if (['node','way','relation'].indexOf(type) >= 0 && /^\d+$/.test(id)) return 'https://www.openstreetmap.org/' + type + '/' + id;
    var lat = Number(place && place.lat), lon = Number(place && place.lon);
    return isFinite(lat) && isFinite(lon) ? 'https://www.openstreetmap.org/?mlat=' + lat.toFixed(6) + '&mlon=' + lon.toFixed(6) + '#map=17/' + lat.toFixed(6) + '/' + lon.toFixed(6) : 'https://www.openstreetmap.org/';
  }
  function transitRouteUrl(origin, destination) {
    if (!origin || !destination) return '';
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(Number(origin.lat).toFixed(6) + ',' + Number(origin.lon).toFixed(6)) + '&destination=' + encodeURIComponent(Number(destination.lat).toFixed(6) + ',' + Number(destination.lon).toFixed(6)) + '&travelmode=transit';
  }
  function visiblePoiItems(state) {
    return (state.nearby || []).filter(function(item){
      if (!item || item.type === 'speed') return false;
      if (item.type === 'service') return !!state.showServices;
      if (item.type === 'transit') return state.travelMode === 'walk';
      return !!state.showNearby;
    });
  }
  function parkingCategory(item) {
    var fee = safePlaceText(item && item.fee).toLowerCase(), charge = safePlaceText(item && item.charge).toLowerCase(), text = (fee + ' ' + charge).trim();
    if (/\b(no|free|none)\b/.test(text) || /(^|\D)0(?:[.,]0+)?(?:\D|$)/.test(text)) return 'free';
    var number = text.match(/(?:^|\D)(\d+(?:[.,]\d+)?)/);
    if (number && Number(number[1].replace(',','.')) <= 3) return 'cheap';
    if (/\b(yes|paid|ticket|meter)\b/.test(text) || charge) return 'paid';
    return 'unknown';
  }
  function parkingPriceLabel(item, t) {
    var category = parkingCategory(item), detail = safePlaceText(item && item.charge);
    if (category === 'free') return t('free');
    if (category === 'cheap') return detail || t('lowCost');
    if (category === 'paid') return detail || t('paid');
    return t('unknownFee');
  }

  function formatDuration(seconds, lang) {
    if (!isFinite(seconds)) return '—';
    var minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60), mins = minutes % 60;
    return hours + ' h' + (mins ? ' ' + mins + ' min' : '');
  }
  function formatTime(timestamp, lang) {
    try { return new Intl.DateTimeFormat(lang, {hour:'2-digit', minute:'2-digit'}).format(new Date(timestamp)); } catch (_) { return ''; }
  }
  function timeAgo(value, t) {
    var seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return t('justNow');
    if (seconds < 3600) return Math.round(seconds / 60) + ' min';
    if (seconds < 86400) return Math.round(seconds / 3600) + ' h';
    return Math.round(seconds / 86400) + ' d';
  }
  function haversine(a, b) {
    if (!a || !b) return Infinity;
    var R = 6371000, p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
    var dp = (b.lat - a.lat) * Math.PI / 180, dl = (b.lon - a.lon) * Math.PI / 180;
    var s = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function nearestOnRoute(point, coords) {
    if (!point || !coords || coords.length < 2) return null;
    var latScale = 110540, lonScale = Math.max(1, Math.cos(point.lat * Math.PI / 180) * 111320);
    var px = point.lon * lonScale, py = point.lat * latScale, total = 0;
    var best = {distance:Infinity, along:0, total:0, segment:0, ratio:0, lat:Number(coords[0][1]), lon:Number(coords[0][0])};
    for (var i = 1; i < coords.length; i += 1) {
      var ax = coords[i - 1][0] * lonScale, ay = coords[i - 1][1] * latScale;
      var bx = coords[i][0] * lonScale, by = coords[i][1] * latScale;
      var vx = bx - ax, vy = by - ay, lengthSquared = vx * vx + vy * vy, length = Math.sqrt(lengthSquared), ratio = 0;
      if (lengthSquared > 0) ratio = clamp(((px - ax) * vx + (py - ay) * vy) / lengthSquared, 0, 1);
      var qx = ax + vx * ratio, qy = ay + vy * ratio;
      var distance = Math.sqrt(Math.pow(px - qx, 2) + Math.pow(py - qy, 2));
      if (distance < best.distance) best = {distance:distance, along:total + length * ratio, total:0, segment:i - 1, ratio:ratio, lat:qy / latScale, lon:qx / lonScale};
      total += length;
    }
    best.total = total;
    return best;
  }
  function bearingBetween(a, b) {
    if (!a || !b) return null;
    var p1 = Number(a.lat) * Math.PI / 180, p2 = Number(b.lat) * Math.PI / 180, dl = (Number(b.lon) - Number(a.lon)) * Math.PI / 180;
    var y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    if (!isFinite(x) || !isFinite(y) || (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12)) return null;
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function blendBearing(current, target, amount) {
    if (!isFinite(target)) return isFinite(current) ? current : 0;
    if (!isFinite(current)) return (target + 360) % 360;
    var delta = ((target - current + 540) % 360) - 180;
    return (current + delta * clamp(amount, 0, 1) + 360) % 360;
  }
  function routeBearingAt(coords, nearest, lookAhead) {
    if (!coords || coords.length < 2 || !nearest) return null;
    var start = {lat:Number(nearest.lat), lon:Number(nearest.lon)}, current = start, remaining = Math.max(8, Number(lookAhead || 35));
    for (var i = Math.max(0, Number(nearest.segment || 0)); i < coords.length - 1; i += 1) {
      var next = {lat:Number(coords[i + 1][1]), lon:Number(coords[i + 1][0])}, distance = haversine(current, next);
      if (!isFinite(distance) || distance < .2) { current = next; continue; }
      if (distance >= remaining) {
        var ratio = remaining / distance;
        return bearingBetween(start, {lat:current.lat + (next.lat - current.lat) * ratio, lon:current.lon + (next.lon - current.lon) * ratio});
      }
      remaining -= distance;
      current = next;
    }
    return bearingBetween(start, current);
  }

  function routePointAhead(coords, nearest, metres) {
    if (!coords || coords.length < 2 || !nearest) return null;
    var current = {lat:Number(nearest.lat), lon:Number(nearest.lon)}, remaining = Math.max(0, Number(metres || 0));
    for (var i = Math.max(0, Number(nearest.segment || 0)); i < coords.length - 1; i += 1) {
      var next = {lat:Number(coords[i + 1][1]), lon:Number(coords[i + 1][0])}, distance = haversine(current, next);
      if (!isFinite(distance) || distance < .2) { current = next; continue; }
      if (distance >= remaining) {
        var ratio = distance > 0 ? remaining / distance : 0;
        return {lat:current.lat + (next.lat - current.lat) * ratio, lon:current.lon + (next.lon - current.lon) * ratio};
      }
      remaining -= distance;
      current = next;
    }
    return current;
  }
  function pointFromBearing(start, bearing, metres) {
    if (!start || !isFinite(start.lat) || !isFinite(start.lon) || !isFinite(bearing)) return null;
    var radius = 6371000, angular = Math.max(0, Number(metres || 0)) / radius, course = Number(bearing) * Math.PI / 180;
    var lat1 = Number(start.lat) * Math.PI / 180, lon1 = Number(start.lon) * Math.PI / 180;
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(course));
    var lon2 = lon1 + Math.atan2(Math.sin(course) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
    return {lat:lat2 * 180 / Math.PI, lon:((lon2 * 180 / Math.PI + 540) % 360) - 180};
  }

  function TileMap(container, options) {
    this.container = container;
    this.options = options || {};
    this.center = {lat:51.5074, lon:-0.1278};
    this.zoom = 11;
    this.route = null;
    this.alternatives = [];
    this.reports = [];
    this.destination = null;
    this.user = null;
    this.mode = 'car';
    this.poi = [];
    this.mapStyle = 'road';
    this.bearing = 0;
    this.renderWidth = 0;
    this.renderHeight = 0;
    this.tileUrl = this.options.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    this.pointers = new Map();
    this.pinch = null;
    this.drag = null;
    this.frame = null;
    this.navigationFrame = null;
    this.navigationLastPaint = 0;
    this.navigationLastFrame = 0;
    this.navigationTarget = null;
    this.overlayLayers = null;
    this.reportNodes = {};
    this.poiNodes = {};
    this.alternativeNodes = [];
    this.preloadImages = [];
    this.preloadKeys = {};
    this.tileNodes = {};
    this.tileLayer = document.createElement('div');
    this.tileLayer.className = 'map-tiles';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'map-overlay');
    this.attribution = document.createElement('a');
    this.attribution.className = 'map-attribution';
    this.attribution.href = 'https://www.openstreetmap.org/copyright';
    this.attribution.target = '_blank';
    this.attribution.rel = 'noopener';
    this.attribution.textContent = '© OpenStreetMap';
    container.classList.add('tile-map', 'map-style-road');
    container.appendChild(this.tileLayer);
    container.appendChild(this.svg);
    container.appendChild(this.attribution);
    this.bind();
    this.render();
  }
  TileMap.prototype.worldSize = function () { return 256 * Math.pow(2, this.zoom); };
  TileMap.prototype.project = function (lat, lon) {
    var size = this.worldSize(), sin = Math.sin(clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180);
    return {x:(lon + 180) / 360 * size, y:(0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size};
  };
  TileMap.prototype.unproject = function (x, y) {
    var size = this.worldSize(), lon = x / size * 360 - 180;
    var n = Math.PI - 2 * Math.PI * y / size, lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return {lat:lat, lon:lon};
  };
  TileMap.prototype.bind = function () {
    var self = this;
    function pointerDistance(a, b) { var dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }
    this.onPointerDown = function (event) {
      if (event.button != null && event.button !== 0) return;
      if (typeof self.options.onUserMove === 'function') self.options.onUserMove();
      self.container.setPointerCapture && self.container.setPointerCapture(event.pointerId);
      self.pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
      if (self.pointers.size >= 2) {
        var values=Array.from(self.pointers.values());
        self.pinch={distance:pointerDistance(values[0],values[1]),zoom:self.zoom};
        self.drag=null;
      } else {
        self.drag={id:event.pointerId,x:event.clientX,y:event.clientY,center:self.project(self.center.lat,self.center.lon),moved:false};
      }
      self.container.classList.add('dragging');
    };
    this.onPointerMove = function (event) {
      if (!self.pointers.has(event.pointerId)) return;
      self.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if (self.pointers.size >= 2 && self.pinch) {
        var values=Array.from(self.pointers.values()),distance=pointerDistance(values[0],values[1]);
        if (self.pinch.distance > 0) self.zoom=clamp(Math.round(self.pinch.zoom+Math.log(distance/self.pinch.distance)/Math.LN2),3,19);
        self.scheduleRender();
        return;
      }
      if (!self.drag || self.drag.id !== event.pointerId) return;
      var dx=event.clientX-self.drag.x,dy=event.clientY-self.drag.y;
      if (Math.abs(dx)+Math.abs(dy)>5) self.drag.moved=true;
      self.center=self.unproject(self.drag.center.x-dx,self.drag.center.y-dy);
      self.center.lat=clamp(self.center.lat,-85,85);
      self.scheduleRender();
    };
    this.onPointerUp = function (event) {
      var drag=self.drag,moved=drag&&drag.moved;
      self.pointers.delete(event.pointerId);
      if (self.pointers.size<2) self.pinch=null;
      if (self.pointers.size===1) {
        var entry=Array.from(self.pointers.entries())[0];
        self.drag={id:entry[0],x:entry[1].x,y:entry[1].y,center:self.project(self.center.lat,self.center.lon),moved:true};
      } else if (!self.pointers.size) {
        self.drag=null; self.container.classList.remove('dragging');
      }
      if (drag && drag.id===event.pointerId && !moved && typeof self.options.onClick==='function') {
        var rect=self.container.getBoundingClientRect(),c=self.project(self.center.lat,self.center.lon);
        var point=self.unproject(c.x+event.clientX-rect.left-rect.width/2,c.y+event.clientY-rect.top-rect.height/2);
        self.options.onClick(point);
      }
    };
    this.onWheel=function(event){event.preventDefault();if(typeof self.options.onUserMove==='function')self.options.onUserMove();self.setZoom(self.zoom+(event.deltaY<0?1:-1));};
    this.onDoubleClick=function(event){event.preventDefault();if(typeof self.options.onUserMove==='function')self.options.onUserMove();self.setZoom(self.zoom+1);};
    this.onResize=function(){self.scheduleRender();};
    this.onOrientationChange=function(){setTimeout(function(){self.scheduleRender();},80);};
    this.container.addEventListener('pointerdown',this.onPointerDown);
    window.addEventListener('pointermove',this.onPointerMove);
    window.addEventListener('pointerup',this.onPointerUp);
    window.addEventListener('pointercancel',this.onPointerUp);
    if (!window.PointerEvent) {
      function touchEvent(touch) { return {button:0,pointerId:'touch-'+touch.identifier,clientX:touch.clientX,clientY:touch.clientY}; }
      this.onTouchStart=function(event){if(event.cancelable)event.preventDefault();for(var i=0;i<event.changedTouches.length;i+=1)self.onPointerDown(touchEvent(event.changedTouches[i]));};
      this.onTouchMove=function(event){if(event.cancelable)event.preventDefault();for(var i=0;i<event.changedTouches.length;i+=1)self.onPointerMove(touchEvent(event.changedTouches[i]));};
      this.onTouchEnd=function(event){if(event.cancelable)event.preventDefault();for(var i=0;i<event.changedTouches.length;i+=1)self.onPointerUp(touchEvent(event.changedTouches[i]));};
      this.onMouseDown=function(event){self.onPointerDown({button:event.button,pointerId:'mouse',clientX:event.clientX,clientY:event.clientY});};
      this.onMouseMove=function(event){self.onPointerMove({button:event.button,pointerId:'mouse',clientX:event.clientX,clientY:event.clientY});};
      this.onMouseUp=function(event){self.onPointerUp({button:event.button,pointerId:'mouse',clientX:event.clientX,clientY:event.clientY});};
      this.container.addEventListener('touchstart',this.onTouchStart,{passive:false});window.addEventListener('touchmove',this.onTouchMove,{passive:false});window.addEventListener('touchend',this.onTouchEnd,{passive:false});window.addEventListener('touchcancel',this.onTouchEnd,{passive:false});
      this.container.addEventListener('mousedown',this.onMouseDown);window.addEventListener('mousemove',this.onMouseMove);window.addEventListener('mouseup',this.onMouseUp);
    }
    this.container.addEventListener('wheel',this.onWheel,{passive:false});
    this.container.addEventListener('dblclick',this.onDoubleClick);
    window.addEventListener('resize',this.onResize);
    window.addEventListener('orientationchange',this.onOrientationChange);
    if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(function(){self.scheduleRender();});this.resizeObserver.observe(this.container);}
  };
  TileMap.prototype.destroy = function () {
    this.destroyed = true;
    if (this.frame) { cancelAnimationFrame(this.frame); this.frame = null; }
    if (this.navigationFrame) { cancelAnimationFrame(this.navigationFrame); this.navigationFrame = null; }
    this.navigationTarget = null; this.navigationLastFrame = 0;
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    if (this.onTouchStart) { this.container.removeEventListener('touchstart',this.onTouchStart);window.removeEventListener('touchmove',this.onTouchMove);window.removeEventListener('touchend',this.onTouchEnd);window.removeEventListener('touchcancel',this.onTouchEnd); }
    if (this.onMouseDown) { this.container.removeEventListener('mousedown',this.onMouseDown);window.removeEventListener('mousemove',this.onMouseMove);window.removeEventListener('mouseup',this.onMouseUp); }
    this.container.removeEventListener('wheel', this.onWheel);
    this.container.removeEventListener('dblclick', this.onDoubleClick);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
  };
  TileMap.prototype.scheduleRender = function () {
    var self = this;
    if (this.destroyed || this.frame) return;
    this.frame = requestAnimationFrame(function () { self.frame = null; self.render(); });
  };
  TileMap.prototype.setView = function (center, zoom) {
    this.navigationTarget = null;
    if (this.navigationFrame) { cancelAnimationFrame(this.navigationFrame); this.navigationFrame = null; this.navigationLastFrame = 0; }
    if (center && isFinite(center.lat) && isFinite(center.lon)) this.center = {lat:center.lat, lon:center.lon};
    if (isFinite(zoom)) this.zoom = clamp(Math.round(zoom), 3, 19);
    this.bearing = 0;
    this.scheduleRender();
  };
  TileMap.prototype.setBearing = function (bearing) {
    if (this.navigationFrame) { cancelAnimationFrame(this.navigationFrame); this.navigationFrame = null; }
    this.navigationTarget = null; this.navigationLastFrame = 0;
    this.bearing = isFinite(bearing) ? ((Number(bearing) % 360) + 360) % 360 : 0;
    this.scheduleRender();
  };
  TileMap.prototype.setNavigationView = function (position, bearing, zoom, offsetRatio) {
    if (!position || !isFinite(position.lat) || !isFinite(position.lon)) return;
    if (isFinite(zoom)) this.zoom = clamp(Math.round(zoom), 3, 19);
    var targetBearing = isFinite(bearing) ? ((Number(bearing) % 360) + 360) % 360 : Number(this.bearing || 0);
    var rect = this.container.getBoundingClientRect(), ratio = clamp(Number(offsetRatio || .28), .16, .36), ahead = Math.max(70, Math.min(230, rect.height * ratio));
    var projected = this.project(Number(position.lat), Number(position.lon)), radians = targetBearing * Math.PI / 180;
    var targetCenter = this.unproject(projected.x + Math.sin(radians) * ahead, projected.y - Math.cos(radians) * ahead);
    var targetUser = {lat:Number(position.lat), lon:Number(position.lon), accuracy:Number(position.accuracy || 0), speed:position.speed, heading:position.heading, timestamp:position.timestamp};
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var jump = !this.user || haversine(this.user, targetUser) > 450 || !isFinite(this.center.lat) || !isFinite(this.center.lon);
    this.navigationTarget = {center:targetCenter, bearing:targetBearing, user:targetUser, updatedAt:Date.now()};
    if (reduced || jump) {
      this.center = targetCenter; this.bearing = targetBearing; this.user = targetUser;
      this.navigationLastFrame = 0; this.scheduleRender(); return;
    }
    if (this.navigationFrame) return;
    var self = this;
    function animateCamera(timestamp) {
      if (self.destroyed) { self.navigationFrame = null; self.navigationLastFrame = 0; return; }
      var target = self.navigationTarget;
      if (!target) { self.navigationFrame = null; self.navigationLastFrame = 0; return; }
      var now = timestamp || Date.now(), dt = self.navigationLastFrame ? clamp(now - self.navigationLastFrame, 8, 64) : 16;
      self.navigationLastFrame = now;
      var speed = Math.max(0, Number(target.user.speed || 0));
      var low = document.documentElement.classList.contains('low-performance');
      var centerTime = low ? 430 : (speed > 10 ? 220 : (speed > 2 ? 300 : 420));
      var userTime = low ? 330 : (speed > 10 ? 150 : (speed > 2 ? 210 : 310));
      var bearingTime = low ? 460 : (speed > 10 ? 190 : (speed > 2 ? 280 : 430));
      var centerAlpha = 1 - Math.exp(-dt / centerTime), userAlpha = 1 - Math.exp(-dt / userTime), bearingAlpha = 1 - Math.exp(-dt / bearingTime);
      var centerLonDelta = ((target.center.lon - self.center.lon + 540) % 360) - 180;
      self.center = {lat:self.center.lat + (target.center.lat - self.center.lat) * centerAlpha, lon:self.center.lon + centerLonDelta * centerAlpha};
      var bearingDelta = ((target.bearing - Number(self.bearing || 0) + 540) % 360) - 180;
      self.bearing = (Number(self.bearing || 0) + bearingDelta * bearingAlpha + 360) % 360;
      var currentUser = self.user || target.user, userLonDelta = ((target.user.lon - currentUser.lon + 540) % 360) - 180;
      var nextAccuracy = Number(currentUser.accuracy || target.user.accuracy || 0) + (Number(target.user.accuracy || 0) - Number(currentUser.accuracy || target.user.accuracy || 0)) * userAlpha;
      self.user = Object.assign({}, target.user, {
        lat:currentUser.lat + (target.user.lat - currentUser.lat) * userAlpha,
        lon:currentUser.lon + userLonDelta * userAlpha,
        accuracy:nextAccuracy
      });
      var frameInterval = low ? 30 : 16;
      if (!self.navigationLastPaint || now - self.navigationLastPaint >= frameInterval) { self.navigationLastPaint = now; self.scheduleRender(); }
      var centerRemaining = haversine(self.center, target.center), userRemaining = haversine(self.user, target.user), bearingRemaining = Math.abs(((target.bearing - self.bearing + 540) % 360) - 180);
      if (target === self.navigationTarget && centerRemaining < .18 && userRemaining < .12 && bearingRemaining < .08 && Date.now() - target.updatedAt > 80) {
        self.center = target.center; self.bearing = target.bearing; self.user = target.user;
        self.navigationFrame = null; self.navigationLastFrame = 0; self.scheduleRender(); return;
      }
      self.navigationFrame = requestAnimationFrame(animateCamera);
    }
    this.navigationFrame = requestAnimationFrame(animateCamera);
  };
  TileMap.prototype.setZoom = function (zoom) {
    var next = clamp(Math.round(zoom), 3, 19);
    if (this.user && Math.abs(this.bearing) > .1) this.setNavigationView(this.user, this.bearing, next, .28);
    else { this.zoom = next; this.scheduleRender(); }
  };
  TileMap.prototype.setRoute = function (route, alternatives) { this.route = route || null; this.alternatives = alternatives || []; this.scheduleRender(); };
  TileMap.prototype.setReports = function (reports) { this.reports = reports || []; this.scheduleRender(); };
  TileMap.prototype.setDestination = function (destination) { this.destination = destination || null; this.scheduleRender(); };
  TileMap.prototype.setUser = function (position) { this.user = position || null; this.scheduleRender(); };
  TileMap.prototype.setMode = function (mode) { this.mode = ['car','bike','walk'].indexOf(mode) >= 0 ? mode : 'car'; this.scheduleRender(); };
  TileMap.prototype.setPoi = function (items) { this.poi = Array.isArray(items) ? items : []; this.scheduleRender(); };
  TileMap.prototype.setTileStyle = function (style, roadUrl) {
    this.mapStyle = style === 'satellite' ? 'satellite' : 'road';
    this.tileUrl = this.mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : (roadUrl || this.options.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    this.container.classList.toggle('map-style-road', this.mapStyle === 'road');
    this.container.classList.toggle('map-style-satellite', this.mapStyle === 'satellite');
    this.attribution.textContent = this.mapStyle === 'satellite' ? 'Tiles © Esri' : '© OpenStreetMap';
    if (typeof this.preloadPoints === 'function') this.preloadPoints([this.user || this.center, this.center], this.zoom, 12);
    this.scheduleRender();
  };
  TileMap.prototype.fitCoordinates = function (coordinates) {
    if (!coordinates || !coordinates.length) return;
    var minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    coordinates.forEach(function (point) { minLon = Math.min(minLon, point[0]); maxLon = Math.max(maxLon, point[0]); minLat = Math.min(minLat, point[1]); maxLat = Math.max(maxLat, point[1]); });
    this.center = {lat:(minLat + maxLat) / 2, lon:(minLon + maxLon) / 2};
    var rect = this.container.getBoundingClientRect(), width = Math.max(200, rect.width - 70), height = Math.max(200, rect.height - 260);
    for (var z = 17; z >= 3; z -= 1) {
      this.zoom = z;
      var a = this.project(maxLat, minLon), b = this.project(minLat, maxLon);
      if (Math.abs(b.x - a.x) <= width && Math.abs(b.y - a.y) <= height) break;
    }
    this.scheduleRender();
  };
  TileMap.prototype.pixelFor = function (lat, lon) {
    var rect = this.container.getBoundingClientRect(), width = this.renderWidth || rect.width, height = this.renderHeight || rect.height;
    var center = this.project(this.center.lat, this.center.lon), point = this.project(lat, lon);
    var dx = point.x - center.x, size = this.worldSize();
    if (dx > size / 2) dx -= size;
    if (dx < -size / 2) dx += size;
    return {x:width / 2 + dx, y:height / 2 + (point.y - center.y)};
  };
  TileMap.prototype.pathFor = function (coordinates) {
    var self = this, rows = coordinates || [], low = document.documentElement.classList.contains('low-performance');
    var maximum = low ? 650 : 1400, stride = rows.length > maximum ? Math.ceil(rows.length / maximum) : 1, output = [];
    for (var index = 0; index < rows.length; index += stride) {
      var point = rows[index], pixel = self.pixelFor(point[1], point[0]);
      output.push((output.length ? 'L' : 'M') + pixel.x.toFixed(1) + ' ' + pixel.y.toFixed(1));
    }
    if (rows.length > 1 && (rows.length - 1) % stride !== 0) {
      var last = rows[rows.length - 1], lastPixel = self.pixelFor(last[1], last[0]);
      output.push('L' + lastPixel.x.toFixed(1) + ' ' + lastPixel.y.toFixed(1));
    }
    return output.join(' ');
  };
  TileMap.prototype.svgNode = function (name, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  };
  TileMap.prototype.tileUrlFor = function (template, zoom, x, y) {
    var hosts = ['a','b','c'], host = hosts[Math.abs(Number(x) + Number(y)) % hosts.length];
    return String(template || '').replace('{z}', zoom).replace('{x}', x).replace('{y}', y).replace('{s}', host).replace('{r}', window.devicePixelRatio > 1.35 ? '@2x' : '');
  };
  TileMap.prototype.ensureOverlayLayers = function () {
    if (this.overlayLayers && this.overlayLayers.root && this.overlayLayers.root.parentNode === this.svg) return this.overlayLayers;
    this.svg.replaceChildren();
    var root = this.svgNode('g', {'class':'map-overlay-root'}), alternatives = this.svgNode('g', {'class':'map-alternatives-layer'}), routePrevious = this.svgNode('g', {'class':'map-route-previous-layer'}), route = this.svgNode('g', {'class':'map-route-layer'});
    var previousRouteShadow = this.svgNode('path', {'class':'route-shadow route-previous-shadow'}), previousRouteLine = this.svgNode('path', {'class':'route-line route-previous-line'});
    var routeShadow = this.svgNode('path', {'class':'route-shadow'}), routeLine = this.svgNode('path', {'class':'route-line'});
    var reports = this.svgNode('g', {'class':'map-reports-layer'}), poi = this.svgNode('g', {'class':'map-poi-layer'}), destination = this.svgNode('g', {'class':'map-destination-layer'}), user = this.svgNode('g', {'class':'map-user-layer'});
    var destinationOuter = this.svgNode('circle', {r:13, 'class':'map-pin destination'}), destinationInner = this.svgNode('circle', {r:4, fill:'#6df58b'});
    var accuracy = this.svgNode('circle', {'class':'user-accuracy'}), marker = this.svgNode('g', {'class':'user-location-marker'});
    routePrevious.appendChild(previousRouteShadow); routePrevious.appendChild(previousRouteLine);
    route.appendChild(routeShadow); route.appendChild(routeLine);
    destination.appendChild(destinationOuter); destination.appendChild(destinationInner);
    user.appendChild(accuracy); user.appendChild(marker);
    root.appendChild(alternatives); root.appendChild(routePrevious); root.appendChild(route); root.appendChild(reports); root.appendChild(poi); root.appendChild(destination); root.appendChild(user); this.svg.appendChild(root);
    this.overlayLayers = {root:root, alternatives:alternatives, routePrevious:routePrevious, previousRouteShadow:previousRouteShadow, previousRouteLine:previousRouteLine, route:route, routeShadow:routeShadow, routeLine:routeLine, reports:reports, poi:poi, destination:destination, destinationOuter:destinationOuter, destinationInner:destinationInner, user:user, accuracy:accuracy, marker:marker};
    this.reportNodes = {}; this.poiNodes = {}; this.alternativeNodes = []; this.userMarkerMode = null;
    return this.overlayLayers;
  };
  TileMap.prototype.ensureUserMarker = function () {
    var layers = this.ensureOverlayLayers(), marker = layers.marker;
    if (this.userMarkerMode === this.mode && marker.childNodes.length) return marker;
    marker.replaceChildren(); marker.setAttribute('class', 'user-location-marker user-location-' + this.mode);
    marker.appendChild(this.svgNode('circle',{cx:0,cy:0,r:14,'class':'user-location-pulse'}));
    marker.appendChild(this.svgNode('circle',{cx:0,cy:0,r:11,'class':'user-location-ring'}));
    marker.appendChild(this.svgNode('circle',{cx:0,cy:0,r:7,'class':'user-location-dot'}));
    var badge=this.svgNode('g',{'class':'user-mode-badge',transform:'translate(11 11)'});
    badge.appendChild(this.svgNode('circle',{cx:0,cy:0,r:9,'class':'user-mode-badge-bg'}));
    if(this.mode==='bike'){
      badge.appendChild(this.svgNode('circle',{cx:-4.6,cy:3.2,r:2.5,'class':'user-mode-line'}));
      badge.appendChild(this.svgNode('circle',{cx:4.6,cy:3.2,r:2.5,'class':'user-mode-line'}));
      badge.appendChild(this.svgNode('path',{d:'M-4.6 3.2 -1.2 -2.2 2 3.2 M-1.2 -2.2 3.2 -2.2 4.6 3.2 M-1.2 -2.2 -3.4 -4.2','class':'user-mode-line'}));
    }else if(this.mode==='walk'){
      badge.appendChild(this.svgNode('circle',{cx:0,cy:-4.2,r:1.7,'class':'user-mode-fill'}));
      badge.appendChild(this.svgNode('path',{d:'M0 -2.4 0 1.2 M0 -0.7 -3.3 1 M0 -0.7 3 1 M0 1.2 -2.8 5 M0 1.2 3 5','class':'user-mode-line'}));
    }else{
      badge.appendChild(this.svgNode('path',{d:'M-5 3.7V-1.2l2-3.4h6l2 3.4v4.9H3.2V1.8h-6.4v1.9Z','class':'user-mode-fill'}));
      badge.appendChild(this.svgNode('circle',{cx:-3.3,cy:3.7,r:1.2,'class':'user-mode-wheel'}));
      badge.appendChild(this.svgNode('circle',{cx:3.3,cy:3.7,r:1.2,'class':'user-mode-wheel'}));
      badge.appendChild(this.svgNode('path',{d:'M-2.7 -1.2 -1.7 -3.1h3.4l1 1.9Z','class':'user-mode-window'}));
    }
    marker.appendChild(badge); this.userMarkerMode = this.mode; return marker;
  };
  TileMap.prototype.syncPointLayer = function (kind, items, viewWidth, viewHeight) {
    var self=this, layers=this.ensureOverlayLayers(), layer=kind==='report'?layers.reports:layers.poi, cache=kind==='report'?this.reportNodes:this.poiNodes, next={};
    (items||[]).forEach(function(item,index){
      var key=String(item&&item.id!=null?item.id:(kind+':'+index+':'+item.lat+':'+item.lon)),entry=cache[key];
      if(!entry){var group=self.svgNode('g',{'class':kind==='report'?'map-pin-group':'map-poi-group'}),circle=self.svgNode('circle',{cx:0,cy:0}),label=self.svgNode('text',{x:0,y:4,'text-anchor':'middle','font-size':'11'});group.appendChild(circle);group.appendChild(label);layer.appendChild(group);entry={group:group,circle:circle,label:label};}
      var pixel=self.pixelFor(Number(item.lat),Number(item.lon)),visible=pixel.x>=-35&&pixel.x<=viewWidth+35&&pixel.y>=-35&&pixel.y<=viewHeight+35;
      entry.group.style.display=visible?'':'none';
      if(visible)entry.group.setAttribute('transform','translate('+pixel.x.toFixed(2)+' '+pixel.y.toFixed(2)+')');
      if(kind==='report'){
        entry.group.setAttribute('class','map-pin-group');entry.circle.setAttribute('r','12');entry.circle.setAttribute('class','map-pin report-'+item.type);entry.label.textContent=REPORT_ICONS[item.type]||'!';
      }else{
        entry.group.setAttribute('class','map-poi-group poi-'+item.type);entry.circle.setAttribute('r',item.type==='camera'?'11':'10');entry.circle.setAttribute('class','map-poi poi-'+item.type);entry.label.textContent=item.type==='camera'?'⌁':(item.type==='fuel'?'⛽':(item.type==='service'?'S':(item.type==='transit'?'▣':'P')));
      }
      next[key]=entry;
    });
    Object.keys(cache||{}).forEach(function(key){if(!next[key]&&cache[key]&&cache[key].group.parentNode)cache[key].group.parentNode.removeChild(cache[key].group);});
    if(kind==='report')this.reportNodes=next;else this.poiNodes=next;
  };
  TileMap.prototype.render = function () {
    if (this.destroyed || !this.container || !this.container.isConnected) return;
    var rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var rotated = Math.abs(Number(this.bearing || 0)) > .1, layerSize = rotated ? Math.ceil(Math.sqrt(rect.width * rect.width + rect.height * rect.height) + 112) : 0;
    var viewWidth = rotated ? layerSize : rect.width, viewHeight = rotated ? layerSize : rect.height;
    this.renderWidth = viewWidth; this.renderHeight = viewHeight;
    var mapBearing = Number(this.bearing || 0);
    [this.tileLayer, this.svg].forEach(function(layer){
      layer.style.left = ((rect.width - viewWidth) / 2) + 'px'; layer.style.top = ((rect.height - viewHeight) / 2) + 'px';
      layer.style.right = 'auto'; layer.style.bottom = 'auto'; layer.style.width = viewWidth + 'px'; layer.style.height = viewHeight + 'px';
      layer.style.transformOrigin = '50% 50%'; layer.style.transform = 'translate3d(0,0,0)' + (rotated ? ' rotate(' + (-mapBearing).toFixed(3) + 'deg)' : '');
    });
    var center = this.project(this.center.lat, this.center.lon), startX = center.x - viewWidth / 2, startY = center.y - viewHeight / 2;
    var tilePadding = document.documentElement.classList.contains('low-performance') ? 0 : 1;
    var minTileX = Math.floor(startX / 256) - tilePadding, maxTileX = Math.floor((startX + viewWidth) / 256) + tilePadding;
    var minTileY = Math.floor(startY / 256) - tilePadding, maxTileY = Math.floor((startY + viewHeight) / 256) + tilePadding, tileCount = Math.pow(2, this.zoom);
    var fragment = document.createDocumentFragment(), template = this.tileUrl || this.options.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    var nextTiles = {}, oldTiles = this.tileNodes || {}, styleKey = this.mapStyle + ':' + this.zoom + ':' + template;
    var centerTileX=Math.floor(center.x/256),centerTileY=Math.floor(center.y/256);
    for (var y = minTileY; y <= maxTileY; y += 1) {
      if (y < 0 || y >= tileCount) continue;
      for (var x = minTileX; x <= maxTileX; x += 1) {
        var wrappedX = ((x % tileCount) + tileCount) % tileCount;
        var tileKey = styleKey + ':' + wrappedX + ':' + y, img = oldTiles[tileKey];
        if (!img) {
          img = document.createElement('img'); img.className = 'map-tile is-loading'; img.alt = ''; img.draggable = false; img.loading = 'eager'; img._styleKey=styleKey;
          try { img.decoding = 'async'; } catch (_) {}
          try { if(Math.abs(x-centerTileX)<=1&&Math.abs(y-centerTileY)<=1)img.fetchPriority='high'; } catch (_) {}
          img.onload = function () { this.classList.remove('is-loading'); this.classList.add('is-ready'); };
          img.onerror = function () { this.classList.remove('is-loading'); this.classList.add('is-error'); };
          img.src = this.tileUrlFor(template, this.zoom, wrappedX, y);
        } else {
          if(img._removeTimer){clearTimeout(img._removeTimer);img._removeTimer=null;}img.classList.remove('is-stale');
        }
        img.style.left = (x * 256 - startX).toFixed(2) + 'px'; img.style.top = (y * 256 - startY).toFixed(2) + 'px';
        nextTiles[tileKey] = img; if (!img.parentNode) fragment.appendChild(img);
      }
    }
    Object.keys(oldTiles).forEach(function (key) {
      var oldTile = oldTiles[key];
      if (!nextTiles[key] && oldTile && oldTile.parentNode && !oldTile._removeTimer) {
        oldTile.classList.add('is-stale');
        var delay=oldTile._styleKey===styleKey?260:1500;
        oldTile._removeTimer=setTimeout(function () { oldTile._removeTimer=null;if (oldTile && oldTile.parentNode) oldTile.parentNode.removeChild(oldTile); }, delay);
      }
    });
    if (fragment.childNodes.length) this.tileLayer.appendChild(fragment);
    this.tileNodes = nextTiles;
    this.svg.setAttribute('viewBox', '0 0 ' + viewWidth + ' ' + viewHeight);
    var layers=this.ensureOverlayLayers(),self=this;
    var alternatives=this.alternatives||[];
    for(var a=0;a<alternatives.length;a+=1){var alt=this.alternativeNodes[a];if(!alt){alt=this.svgNode('path',{'class':'route-alt'});layers.alternatives.appendChild(alt);this.alternativeNodes[a]=alt;}alt.style.display='';alt.setAttribute('d',this.pathFor(alternatives[a].coordinates));}
    for(var extra=alternatives.length;extra<this.alternativeNodes.length;extra+=1){if(this.alternativeNodes[extra])this.alternativeNodes[extra].style.display='none';}
    if (this.previousRoute && this.previousRoute.coordinates) {var previousRoutePath=this.pathFor(this.previousRoute.coordinates);layers.routePrevious.style.display='';layers.previousRouteShadow.setAttribute('d',previousRoutePath);layers.previousRouteLine.setAttribute('d',previousRoutePath);} else layers.routePrevious.style.display='none';
    if (this.route && this.route.coordinates) {var routePath=this.pathFor(this.route.coordinates);layers.route.style.display='';layers.routeShadow.setAttribute('d',routePath);layers.routeLine.setAttribute('d',routePath);} else layers.route.style.display='none';
    this.syncPointLayer('report',this.reports,viewWidth,viewHeight);this.syncPointLayer('poi',this.poi,viewWidth,viewHeight);
    if(this.destination){var dp=this.pixelFor(this.destination.lat,this.destination.lon);layers.destination.style.display='';layers.destination.setAttribute('transform','translate('+dp.x.toFixed(2)+' '+dp.y.toFixed(2)+')');}else layers.destination.style.display='none';
    if(this.user){
      var up=this.pixelFor(this.user.lat,this.user.lon),cosine=Math.max(.12,Math.cos(this.user.lat*Math.PI/180)),metresPerPixel=40075016.686/this.worldSize()*cosine;
      var accuracy=Math.min(140,Math.max(16,Number(this.user.accuracy||20)/metresPerPixel));
      layers.user.style.display='';layers.accuracy.setAttribute('cx',up.x.toFixed(2));layers.accuracy.setAttribute('cy',up.y.toFixed(2));layers.accuracy.setAttribute('r',accuracy.toFixed(2));
      var marker=this.ensureUserMarker();marker.setAttribute('transform','translate('+up.x.toFixed(2)+' '+up.y.toFixed(2)+') rotate('+Number(this.bearing||0).toFixed(3)+')');
    }else layers.user.style.display='none';
  };

  function LanguageSwitch(props) {
    return h('label', {className:'language-select'}, h('span', null, props.t('language')),
      h('select', {value:props.value, onChange:function(event){props.onChange(event.target.value);}, 'aria-label':props.t('language')},
        Object.keys(LANGUAGES).map(function(code){return h('option',{key:code,value:code},LANGUAGES[code]);})
      )
    );
  }

  function InstallPlatforms(props) {
    return h('div', {className:'install-platforms', role:'group', 'aria-label':props.t('installApp')},
      h('button', {type:'button', className:'install-platform android', onClick:function () { props.onInstall('android'); }},
        h('img', {src:'assets/icons/android.svg', alt:'', width:'32', height:'32'}),
        h('span', null, h('strong', null, props.t('installAndroid')), h('small', null, props.t('androidBadgeText')))
      ),
      h('button', {type:'button', className:'install-platform apple', onClick:function () { props.onInstall('ios'); }},
        h('img', {src:'assets/icons/apple.svg', alt:'', width:'32', height:'32'}),
        h('span', null, h('strong', null, props.t('installApple')), h('small', null, props.t('appleBadgeText')))
      )
    );
  }

  function AppIcon(props) {
    var common = {className:'app-icon', viewBox:'0 0 24 24', width:props.size || 22, height:props.size || 22, fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':'true'};
    var name = props.name;
    if (name === 'zoomIn') return h('svg', common, h('circle', {cx:10.5, cy:10.5, r:6.5}), h('path', {d:'M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6'}));
    if (name === 'zoomOut') return h('svg', common, h('circle', {cx:10.5, cy:10.5, r:6.5}), h('path', {d:'M15.5 15.5 21 21M7.5 10.5h6'}));
    if (name === 'locate') return h('svg', common, h('circle', {cx:12, cy:12, r:6}), h('circle', {cx:12, cy:12, r:2, fill:'currentColor', stroke:'none'}), h('path', {d:'M12 2v3M12 19v3M2 12h3M19 12h3'}));
    if (name === 'pin') return h('svg', common, h('path', {d:'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z'}), h('circle', {cx:12, cy:10, r:2.5}));
    if (name === 'reset') return h('svg', common, h('path', {d:'M4 8V4h4M4.6 4.6A9 9 0 1 1 3 14'}), h('path', {d:'M9 12h6M12 9v6'}));
    if (name === 'search') return h('svg', common, h('circle', {cx:10.5, cy:10.5, r:6.5}), h('path', {d:'M15.5 15.5 21 21'}));
    if (name === 'play') return h('svg', common, h('path', {d:'M8 5v14l11-7Z', fill:'currentColor', stroke:'none'}));
    if (name === 'pause') return h('svg', common, h('rect', {x:7, y:5, width:3.5, height:14, rx:1, fill:'currentColor', stroke:'none'}), h('rect', {x:13.5, y:5, width:3.5, height:14, rx:1, fill:'currentColor', stroke:'none'}));
    if (name === 'car') return h('svg', common, h('path', {d:'M4 15V9l2-5h12l2 5v6'}), h('path', {d:'M3 15h18v4H3zM7 19v2M17 19v2M7 10h10'}));
    if (name === 'bike') return h('svg', common, h('circle', {cx:6, cy:17, r:4}), h('circle', {cx:18, cy:17, r:4}), h('path', {d:'m6 17 4-8 4 8M10 9h5l3 8M9 6h4'}));
    if (name === 'walk') return h('svg', common, h('circle', {cx:12, cy:4, r:2}), h('path', {d:'M12 7v6l-4 8M12 10l5 3M12 13l5 8M12 9 8 7'}));
    if (name === 'layers') return h('svg', common, h('path', {d:'m12 3 9 5-9 5-9-5Z'}), h('path', {d:'m3 12 9 5 9-5M3 16l9 5 9-5'}));
    if (name === 'stop') return h('svg', common, h('rect', {x:6, y:6, width:12, height:12, rx:2}));
    if (name === 'music') return h('svg', common, h('path', {d:'M9 18V5l10-2v13'}), h('circle', {cx:6, cy:18, r:3}), h('circle', {cx:16, cy:16, r:3}));
    if (name === 'map') return h('svg', common, h('path', {d:'m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z'}), h('path', {d:'M8 4v13M16 7v13'}));
    if (name === 'radio') return h('svg', common, h('rect', {x:3, y:7, width:18, height:12, rx:3}), h('path', {d:'m7 7 9-4'}), h('circle', {cx:9, cy:13, r:2.5}), h('path', {d:'M15 12h3M15 15h3'}));
    if (name === 'report') return h('svg', common, h('path', {d:'M12 3 2.8 19h18.4Z'}), h('path', {d:'M12 9v4M12 16h.01'}));
    if (name === 'profile') return h('svg', common, h('circle', {cx:12, cy:8, r:3.5}), h('path', {d:'M5 21a7 7 0 0 1 14 0'}));
    if (name === 'save') return h('svg', common, h('path', {d:'M6 3h10l2 2v16l-6-3-6 3Z'}));
    if (name === 'navigation') return h('svg', common, h('path', {d:'m4 4 16 7-7 2-2 7Z'}));
    if (name === 'arrowLeft') return h('svg', common, h('path', {d:'M19 12H5M12 19l-7-7 7-7'}));
    if (name === 'admin') return h('svg', common, h('path', {d:'M12 3 4.5 6v5.5c0 4.7 3.1 7.8 7.5 9.5 4.4-1.7 7.5-4.8 7.5-9.5V6Z'}), h('circle', {cx:12,cy:10,r:2.3}), h('path', {d:'M8.5 16a3.5 3.5 0 0 1 7 0'}));
    if (name === 'sun') return h('svg', common, h('circle', {cx:12,cy:12,r:3.5}), h('path', {d:'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'}));
    if (name === 'moon') return h('svg', common, h('path', {d:'M20.5 14.2A8.2 8.2 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2Z'}));
    if (name === 'rotate') return h('svg', common, h('rect',{x:7,y:3,width:10,height:18,rx:2}), h('path',{d:'M4 8a9 9 0 0 1 4-5M4 8V3M4 8h5M20 16a9 9 0 0 1-4 5M20 16v5M20 16h-5'}));
    if (name === 'parking') return h('svg', common, h('rect',{x:4,y:3,width:16,height:18,rx:3}), h('path',{d:'M9 17V7h4a3.5 3.5 0 0 1 0 7H9M9 11h4'}));
    if (name === 'bus') return h('svg', common, h('rect',{x:4,y:3,width:16,height:15,rx:3}), h('path',{d:'M7 18v3M17 18v3M4 10h16M8 14h.01M16 14h.01'}));
    if (name === 'photo') return h('svg', common, h('rect',{x:3,y:4,width:18,height:16,rx:3}), h('circle',{cx:9,cy:10,r:2}), h('path',{d:'m21 15-5-5L5 20'}));
    if (name === 'book') return h('svg', common, h('path',{d:'M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2ZM20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2Z'}));
    return h('span', {'aria-hidden':'true'}, props.fallback || '•');
  }

  function IconButton(props) {
    return h('button', {type:'button', className:'icon-btn' + (props.small ? ' small' : '') + (props.active ? ' active' : ''), title:props.title, 'aria-label':props.title, onClick:props.onClick, disabled:props.disabled}, props.icon);
  }

  function Modal(props) {
    return h('div', {className:'modal-backdrop', role:'presentation', onMouseDown:function (event) { if (event.target === event.currentTarget) props.onClose(); }},
      h('section', {className:'modal-card' + (props.className ? ' ' + props.className : ''), role:'dialog', 'aria-modal':'true'},
        h('header', {className:'modal-header'}, h('h2', null, props.title), h('button', {type:'button', className:'modal-close', title:props.closeLabel, 'aria-label':props.closeLabel, onClick:props.onClose}, h('span', {'aria-hidden':'true'}, '×'))),
        props.children
      )
    );
  }

  function AudioBars(props) {
    return h('div', {className:'audio-bars' + (props.playing ? ' playing' : ''), 'aria-hidden':'true'}, h('i'), h('i'), h('i'), h('i'));
  }

  function safePlaceText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    return '';
  }


  var brokenStationArtwork = {};

  function stationArtworkUrl(station) {
    station = station || {};
    var raw = safePlaceText(station.favicon);
    if (!raw) return '';
    var parsed;
    try { parsed = new URL(raw, window.location.href); } catch (_) { return ''; }
    /* HTTPS pages cannot display HTTP station artwork. Some directory entries
       incorrectly put the audio stream itself in the favicon field. */
    if (parsed.protocol !== 'https:' && parsed.origin !== window.location.origin) return '';
    var absolute = parsed.href;
    if (brokenStationArtwork[absolute]) return '';
    var streams = Array.isArray(station.urls) ? station.urls : [];
    for (var i = 0; i < streams.length; i += 1) {
      try { if (new URL(streams[i], window.location.href).href === absolute) return ''; } catch (_) {}
    }
    if (/\.(?:mp3|aac|aacp|ogg|opus|m3u8?|pls|flac|wav)(?:$|[?#])/i.test(parsed.pathname + parsed.search)) return '';
    return absolute;
  }

  function StationLogo(props) {
    var station = props.station || {}, artwork = stationArtworkUrl(station);
    return h('span', {className:'station-logo'},
      h('span', {className:'station-logo-fallback', 'aria-hidden':'true'}, initials(station.name)),
      artwork ? h('img', {src:artwork, alt:'', loading:'lazy', decoding:'async', referrerPolicy:'no-referrer', onError:function (event) { brokenStationArtwork[artwork] = true; event.currentTarget.style.display = 'none'; }}) : null
    );
  }

  function normalisePlaceResult(place, index) {
    if (!place || typeof place !== 'object') return null;
    var lat = Number(place.lat), lon = Number(place.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    var label = safePlaceText(place.label || place.display_name || place.address);
    var address = safePlaceText(place.address || label);
    var title = safePlaceText(place.title || place.name || (label ? label.split(',')[0] : ''));
    if (!title) title = address || 'Place';
    return {
      id:safePlaceText(place.id || place.place_id || ('place-' + index + '-' + lat.toFixed(5) + '-' + lon.toFixed(5))),
      title:title, label:label || address || title, address:address || label || title,
      city:safePlaceText(place.city), postcode:safePlaceText(place.postcode), country:safePlaceText(place.country),
      countryCode:safePlaceText(place.countryCode || place.country_code).toUpperCase(),
      lat:lat, lon:lon, class:safePlaceText(place.class || place.category), type:safePlaceText(place.type),
      website:safePlaceText(place.website), phone:safePlaceText(place.phone), openingHours:safePlaceText(place.openingHours || place.opening_hours),
      osmType:safePlaceText(place.osmType || place.osm_type), osmId:safePlaceText(place.osmId || place.osm_id), wikipedia:safePlaceText(place.wikipedia), wikidata:safePlaceText(place.wikidata)
    };
  }

  function normalisePlaceResults(rows) {
    var seen = {};
    return (Array.isArray(rows) ? rows : []).map(normalisePlaceResult).filter(function (place) {
      if (!place) return false;
      var key = place.id || (place.lat.toFixed(5) + ':' + place.lon.toFixed(5));
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 30);
  }

  function AppErrorBoundary(props) {
    React.Component.call(this, props);
    this.state = {error:null};
  }
  AppErrorBoundary.prototype = Object.create(React.Component.prototype);
  AppErrorBoundary.prototype.constructor = AppErrorBoundary;
  AppErrorBoundary.prototype.componentDidCatch = function (error) {
    this.setState({error:error || new Error('Application error')});
    try { console.error('go-app recovered from a render error', error); } catch (_) {}
  };
  AppErrorBoundary.prototype.render = function () {
    if (!this.state.error) return this.props.children;
    return h('main',{className:'app-recovery'},
      h('section',{className:'panel app-recovery-card'},
        h('span',{className:'eyebrow'},'go-app'),
        h('h1',null,'This screen could not be displayed.'),
        h('p',null,'Your saved data is safe. Reload the app to return to the map and try again.'),
        h('button',{type:'button',className:'btn primary',onClick:function(){window.location.reload();}},'Reload go-app')
      )
    );
  };

  function GoApp() {
    React.Component.call(this);
    var storedLanguage = localStorage.getItem('go-app-language');
    var storedNavCountry = localStorage.getItem('go-app-nav-country') || 'GB';
    var storedRadioCountry = localStorage.getItem('go-app-radio-country') || 'LV';
    this.state = {
      booting:true, entered:false, loading:false, toast:null, toastError:false,
      lang:I18N[storedLanguage] ? storedLanguage : 'en', csrf:'', user:null, app:{}, maps:{}, online:navigator.onLine,
      view:'map', modal:null, authMode:'login', installPrompt:null, installPlatform:null, installed:isStandalone(), keepAwake:localStorage.getItem('go-app-keep-awake') !== 'false', units:localStorage.getItem('go-app-units') === 'mi' ? 'mi' : 'km', theme:localStorage.getItem('go-app-theme') === 'night' ? 'night' : 'day',
      navCountry:NAV_COUNTRIES.indexOf(storedNavCountry) >= 0 ? storedNavCountry : 'ALL', travelMode:['car','bike','walk'].indexOf(localStorage.getItem('go-app-travel-mode')) >= 0 ? localStorage.getItem('go-app-travel-mode') : 'car', mapStyle:localStorage.getItem('go-app-map-style') === 'satellite' ? 'satellite' : 'road',
      destinationQuery:'', suggestions:[], searching:false, destination:null, origin:null, searchQuery:'', searchResults:[], searchLoading:false, searchError:'', searchHasRun:false, selectedPlace:null,
      routes:[], routeIndex:0, routing:false, navigating:false, follow:true, position:null,
      remainingDistance:null, remainingDuration:null, currentStep:null, wakeLock:false, rerouting:false,
      reports:[], reportType:'traffic', reportNote:'',
      radioCountry:RADIO_COUNTRIES.indexOf(storedRadioCountry) >= 0 ? storedRadioCountry : 'LV', radioStations:[], radioSearch:'', radioSource:'', radioLoading:false,
      player:{station:null, status:'paused', playing:false, detail:'', kind:'radio'}, mediaTab:'radio', localTracks:[], localTrackIndex:-1, spotifyStatus:null, spotifyLoading:false,
      savedPlaces:[], serviceWorkerReady:false, features:{}, captcha:{enabled:false,siteKey:''}, namedays:[], weather:null, nearby:[], showNearby:localStorage.getItem('go-app-show-nearby') !== 'false', showServices:localStorage.getItem('go-app-show-services') !== 'false', adDismissed:sessionStorage.getItem('go-app-ad-dismissed') === '1', adIndex:0, activeAlert:null, speedLimit:null, speedOver:false, speedLimitLive:false,
      parkingPlaces:[], parkingFilter:'free', parkingLoading:false, parkingError:''
    };
    this.map = null;
    this.mapNode = null;
    this.audio = null;
    this.audioTimer = null;
    this.reconnectTimer = null;
    this.playerWanted = false;
    this.playerUrlIndex = 0;
    this.playerCandidates = [];
    this.activeStation = null;
    this.reconnectAttempt = 0;
    this.streamAttempt = 0;
    this.failedStreamAttempt = -1;
    this.watchId = null;
    this.wakeLockSentinel = null;
    this.offRouteSince = null;
    this.lastRerouteAt = 0;
    this.searchTimer = null;
    this.placeSearchSequence = 0;
    this.toastTimer = null;
    this.routeProgress = null;
    this.audioKind = 'radio';
    this.localObjectUrl = null;
    this.lastEnvironmentLoad = 0;
    this.spotifyPoll = null;
    this.adTimer = null;
    this.lowPowerMode = false;
    this.arrivalNotified = false;
    this.navigationCacheTimer = null;

    this.setLanguage = this.setLanguage.bind(this);
    this.setView = this.setView.bind(this);
    this.dismissModal = this.dismissModal.bind(this);
    this.handleDestinationInput = this.handleDestinationInput.bind(this);
    this.selectSuggestion = this.selectSuggestion.bind(this);
    this.locate = this.locate.bind(this);
    this.startNavigation = this.startNavigation.bind(this);
    this.stopNavigation = this.stopNavigation.bind(this);
    this.handlePosition = this.handlePosition.bind(this);
    this.playStation = this.playStation.bind(this);
    this.togglePlayer = this.togglePlayer.bind(this);
    this.submitAuth = this.submitAuth.bind(this);
    this.submitReport = this.submitReport.bind(this);
    this.saveDestination = this.saveDestination.bind(this);
    this.installApp = this.installApp.bind(this);
    this.resetMapView = this.resetMapView.bind(this);
    this.toggleUnits = this.toggleUnits.bind(this);
    this.setUnits = this.setUnits.bind(this);
    this.setTravelMode = this.setTravelMode.bind(this);
    this.handlePlaceSearch = this.handlePlaceSearch.bind(this);
    this.submitFeedback = this.submitFeedback.bind(this);
    this.submitNewsletter = this.submitNewsletter.bind(this);
    this.stopPlayer = this.stopPlayer.bind(this);
    this.handleLocalFiles = this.handleLocalFiles.bind(this);
    this.startSpotifyConnect = this.startSpotifyConnect.bind(this);
    this.setTheme = this.setTheme.bind(this);
    this.unlockOrientation = this.unlockOrientation.bind(this);
    this.toggleOrientation = this.toggleOrientation.bind(this);
  }
  GoApp.prototype = Object.create(React.Component.prototype);
  GoApp.prototype.constructor = GoApp;

  GoApp.prototype.t = function (key) {
    return (I18N[this.state.lang] && I18N[this.state.lang][key]) || I18N.en[key] || key;
  };

  GoApp.prototype.api = function (action, options) {
    options = options || {};
    var url = new URL(API_URL, window.location.href);
    url.searchParams.set('action', action);
    Object.keys(options.params || {}).forEach(function (key) {
      var value = options.params[key];
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    var config = {method:options.method || 'GET', credentials:'same-origin', headers:{Accept:'application/json'}};
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutMs = Math.max(4000, Number(options.timeout || 18000));
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
    if (controller) config.signal = controller.signal;
    if (config.method !== 'GET') {
      config.headers['X-CSRF-Token'] = this.state.csrf;
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body || {});
    }
    return fetch(url.toString(), config).then(function (response) {
      return response.text().then(function (text) {
        var data;
        try { data = text ? JSON.parse(text) : {}; } catch (_) {
          var preview = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
          data = {ok:false, message:preview || 'The server returned an invalid response.'};
        }
        if (!response.ok || data.ok === false) throw new Error(data.message || 'Request failed (' + response.status + ').');
        return data && typeof data === 'object' ? data : {};
      });
    }).catch(function (error) {
      if (error && error.name === 'AbortError') throw new Error('The request took too long. Please try again.');
      throw error;
    }).finally(function () { if (timeoutId) clearTimeout(timeoutId); });
  };

  GoApp.prototype.scheduleAdvertRotation = function () {
    var self=this, advertising=this.state.app&&this.state.app.advertising, slides=advertising&&Array.isArray(advertising.slides)?advertising.slides.filter(function(slide){return slide&&slide.enabled!==false&&slide.title;}):[];
    clearInterval(this.adTimer); this.adTimer=null;
    if(slides.length<2)return;
    var interval=Math.max(4,Math.min(30,Number(advertising.intervalSeconds||7)))*1000;
    this.adTimer=setInterval(function(){self.setState(function(state){return {adIndex:(state.adIndex+1)%slides.length};});},interval);
  };

  GoApp.prototype.componentDidMount = function () {
    var self = this;
    document.documentElement.lang = this.state.lang;
    this.applyTheme(this.state.theme);
    this.unlockOrientation();
    this.viewportHandler = function () {
      var viewport = window.visualViewport;
      var width = viewport && viewport.width ? viewport.width : (window.innerWidth || document.documentElement.clientWidth);
      var height = viewport && viewport.height ? viewport.height : (window.innerHeight || document.documentElement.clientHeight);
      var landscape = width > height;
      var previousLandscape = document.documentElement.classList.contains('is-landscape');
      document.documentElement.style.setProperty('--app-width', Math.max(240, Math.round(width)) + 'px');
      var stableHeight = Math.max(240, Math.round(height));
      var currentHeight = parseInt(document.documentElement.style.getPropertyValue('--app-height'), 10) || 0;
      if (previousLandscape !== landscape || !currentHeight || Math.abs(currentHeight - stableHeight) > 72) {
        document.documentElement.style.setProperty('--app-height', stableHeight + 'px');
      }
      document.documentElement.classList.toggle('is-landscape', landscape);
      document.documentElement.classList.toggle('is-portrait', !landscape);
      if (self.map) self.map.scheduleRender();
    };
    this.orientationHandler = function () {
      (self.orientationTimers || []).forEach(function (timer) { clearTimeout(timer); });
      self.viewportHandler();
      self.orientationTimers = [70, 220, 520].map(function (delay) {
        return setTimeout(function () { self.viewportHandler(); }, delay);
      });
    };
    this.viewportHandler();
    window.addEventListener('resize', this.viewportHandler);
    window.addEventListener('orientationchange', this.orientationHandler);
    document.addEventListener('fullscreenchange', this.orientationHandler);
    document.addEventListener('webkitfullscreenchange', this.orientationHandler);
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') window.screen.orientation.addEventListener('change', this.orientationHandler);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.viewportHandler);
    if ((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) document.documentElement.classList.add('low-performance');
    this.setupAudio();
    window.addEventListener('online', function () { self.setState({online:true}); });
    window.addEventListener('offline', function () { self.setState({online:false}); });
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault(); self.setState({installPrompt:event});
    });
    window.addEventListener('appinstalled', function () { self.setState({installed:true, installPrompt:null}); self.showToast(self.t('installed')); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && (self.state.keepAwake || self.state.navigating)) self.requestWakeLock();
    });
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      var appVersion = document.getElementById('go-app-root').dataset.version || '1.2.2';
      navigator.serviceWorker.register('service-worker.js?v=' + encodeURIComponent(appVersion), {updateViaCache:'none'}).then(function (registration) {
        registration.update().catch(function () {});
        return navigator.serviceWorker.ready;
      }).then(function () { self.setState({serviceWorkerReady:true}); }).catch(function () {});
    }
    this.api('state').then(function (data) {
      var language = data.user && I18N[data.user.language] ? data.user.language : self.state.lang;
      var queryView = new URLSearchParams(location.search).get('view');
      self.setState({
        booting:false, csrf:data.csrfToken, user:data.user || null, app:data.app || {}, maps:data.maps || {}, features:data.features || {}, captcha:data.captcha || {enabled:false,siteKey:''}, spotifyConfig:data.spotify || {},
        lang:language, entered:!!data.user, view:['map','search','parking','radio','reports','profile'].indexOf(queryView) >= 0 ? queryView : 'map'
      }, function () {
        document.documentElement.lang = language;
        self.scheduleAdvertRotation();
        self.loadReports();
        self.loadRadioStations(self.state.radioCountry);
        self.loadSavedPlaces();
        self.loadNamedays();
        if (!self.restoreTrip()) self.restoreNavigationCache();
        self.handleSpotifyCallback();
        if (self.state.entered && self.state.keepAwake) self.requestWakeLock();
      });
    }).catch(function (error) {
      self.setState({booting:false}); self.showToast(error.message, true);
    });
  };

  GoApp.prototype.componentWillUnmount = function () {
    if (this.map) this.map.destroy();
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    if (this.audio) { this.audio.pause(); this.audio.src = ''; }
    clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer); clearTimeout(this.searchTimer); clearTimeout(this.toastTimer); clearTimeout(this.captchaTimer); clearTimeout(this.navigationCacheTimer); clearInterval(this.spotifyPoll); clearInterval(this.adTimer);
    if (this.localObjectUrl) URL.revokeObjectURL(this.localObjectUrl);
    (this.orientationTimers || []).forEach(function (timer) { clearTimeout(timer); });
    if (this.viewportHandler) { window.removeEventListener('resize', this.viewportHandler); if (window.visualViewport) window.visualViewport.removeEventListener('resize', this.viewportHandler); }
    if (this.orientationHandler) { window.removeEventListener('orientationchange', this.orientationHandler); document.removeEventListener('fullscreenchange', this.orientationHandler); document.removeEventListener('webkitfullscreenchange', this.orientationHandler); if (window.screen && window.screen.orientation && typeof window.screen.orientation.removeEventListener === 'function') window.screen.orientation.removeEventListener('change', this.orientationHandler); }
  };

  GoApp.prototype.componentDidUpdate = function (prevProps, prevState) {
    if (this.state.view === 'map' && (!this.map || prevState.view !== 'map')) this.initMapSoon();
    if (this.state.view === 'map' && this.map && this.map.container && this.map.container.isConnected) {
      var route = this.state.routes[this.state.routeIndex] || null;
      this.map.setRoute(route, this.state.routes.filter(function (_, index) { return index !== this.state.routeIndex; }, this));
      this.map.setReports(this.state.reports); this.map.setDestination(this.state.destination); this.map.setUser(this.state.position);
      this.map.setMode(this.state.travelMode); this.map.setPoi(visiblePoiItems(this.state));
      this.map.setTileStyle(this.state.mapStyle, this.state.maps.tileUrl);
    }
    if (prevState.lang !== this.state.lang) { document.documentElement.lang = this.state.lang; this.loadNamedays(); }
    if (prevState.theme !== this.state.theme) this.applyTheme(this.state.theme);
    if (prevState.modal !== this.state.modal || prevState.authMode !== this.state.authMode) this.renderCaptchaSoon();
  };

  GoApp.prototype.setupAudio = function (attempt) {
    var self = this, expected = attempt == null ? this.streamAttempt : attempt;
    if (this.hls) { try { this.hls.destroy(); } catch (_) {} this.hls = null; }
    if (this.audio) {
      try { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); } catch (_) {}
    }
    var audio = new Audio();
    this.audio = audio;
    audio.preload = 'none';
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.addEventListener('playing', function () {
      if (audio !== self.audio || expected !== self.streamAttempt) return;
      clearTimeout(self.audioTimer); clearTimeout(self.reconnectTimer); self.reconnectAttempt = 0;
      self.setPlayerState({status:'playing', playing:true, detail:''});
    });
    audio.addEventListener('pause', function () {
      if (audio !== self.audio) return;
      if (!self.playerWanted) self.setPlayerState({status:'paused', playing:false, detail:''});
    });
    audio.addEventListener('waiting', function () {
      if (audio === self.audio && expected === self.streamAttempt && self.playerWanted) self.setPlayerState({status:'buffering', playing:false, detail:''});
    });
    audio.addEventListener('stalled', function () {
      if (audio === self.audio && expected === self.streamAttempt && self.playerWanted) self.scheduleRadioFailure(10000, expected);
    });
    audio.addEventListener('error', function () {
      if (audio === self.audio && expected === self.streamAttempt && self.playerWanted) self.radioFailure(expected);
    });
    audio.addEventListener('ended', function () {
      if (audio === self.audio && expected === self.streamAttempt && self.playerWanted) self.radioFailure(expected);
    });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', function () { self.resumePlayer(); });
        navigator.mediaSession.setActionHandler('pause', function () { self.pausePlayer(); });
      } catch (_) {}
    }
  };

  GoApp.prototype.setPlayerState = function (patch) {
    /* Radio starts inside the same click event as the station selection. React
       batches those updates, so reading this.state here can drop the station and
       leave audio playing with no visible pause/stop controls. */
    this.setState(function (previous) {
      return {player:Object.assign({}, previous.player || {}, patch || {})};
    });
  };

  GoApp.prototype.showToast = function (message, error) {
    var self = this;
    clearTimeout(this.toastTimer);
    this.setState({toast:message, toastError:!!error});
    this.toastTimer = setTimeout(function () { self.setState({toast:null}); }, 3400);
  };

  GoApp.prototype.setLoading = function (loading) { this.setState({loading:loading}); };

  GoApp.prototype.applyTheme = function (theme) {
    var resolved = theme === 'night' ? 'night' : 'day';
    document.documentElement.classList.toggle('theme-night', resolved === 'night');
    document.documentElement.classList.toggle('theme-day', resolved === 'day');
    var meta = document.querySelector('meta[name=\"theme-color\"]');
    if (meta) meta.setAttribute('content', '#081115');
  };

  GoApp.prototype.setTheme = function (theme) {
    var resolved = theme === 'night' ? 'night' : 'day';
    localStorage.setItem('go-app-theme', resolved);
    this.setState({theme:resolved});
  };

  GoApp.prototype.unlockOrientation = function () {
    try {
      if (window.screen && screen.orientation && typeof screen.orientation.unlock === 'function') screen.orientation.unlock();
    } catch (_) {}
  };

  GoApp.prototype.toggleOrientation = function () {
    var self = this;
    var orientation = window.screen && window.screen.orientation;
    if (!orientation || typeof orientation.lock !== 'function') {
      this.showToast(this.t('rotationUnavailable'), true);
      return;
    }
    var type = orientation.type ? String(orientation.type) : '';
    var landscape = type ? type.indexOf('landscape') === 0 : window.innerWidth > window.innerHeight;
    var target = landscape ? 'portrait' : 'landscape';
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    var fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    var root = document.documentElement;
    var requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
    function refresh() {
      if (self.orientationHandler) self.orientationHandler();
      else if (self.viewportHandler) self.viewportHandler();
    }
    function lock() { return Promise.resolve(orientation.lock(target)); }
    try {
      var ready = Promise.resolve();
      if (!fullscreen && !standalone && typeof requestFullscreen === 'function') {
        ready = Promise.resolve(requestFullscreen.call(root)).catch(function () { return null; });
      }
      ready.then(lock).then(refresh).catch(function () {
        self.unlockOrientation();
        refresh();
        self.showToast(self.t('rotationUnavailable'), true);
      });
    } catch (_) { self.showToast(self.t('rotationUnavailable'), true); }
  };

  GoApp.prototype.setLanguage = function (language) {
    if (!I18N[language]) return;
    localStorage.setItem('go-app-language', language);
    this.setState({lang:language}, function () { this.loadNamedays(); });
    if (this.state.user) {
      this.api('profile_language', {method:'POST', body:{language:language}}).catch(function () {});
    }
  };

  GoApp.prototype.setView = function (view) {
    this.setState({view:view, modal:null}, function () {
      if (view === 'map') this.initMapSoon();
      if (view === 'reports') this.loadReports();
      if (view === 'radio' && !this.state.radioStations.length) this.loadRadioStations(this.state.radioCountry);
    });
  };

  GoApp.prototype.dismissModal = function () { this.setState({modal:null, installPlatform:null}); };

  GoApp.prototype.initMapSoon = function () {
    var self = this;
    setTimeout(function () {
      if (!self.mapNode || (self.map && self.map.container === self.mapNode)) return;
      if (self.map) self.map.destroy();
      self.mapNode.replaceChildren();
      self.map = new TileMap(self.mapNode, {tileUrl:self.state.maps.tileUrl, onClick:function () {}, onUserMove:function () { if (self.state.follow) self.setState({follow:false}); }});
      var initial = self.state.position || self.state.origin || {lat:51.5074, lon:-0.1278};
      self.map.setView(initial, self.state.position ? 15 : 11);
      self.map.setMode(self.state.travelMode);
      self.map.setPoi((self.state.nearby || []).filter(function(item){return item.type === 'service' ? self.state.showServices : self.state.showNearby;}));
      self.map.setTileStyle(self.state.mapStyle, self.state.maps.tileUrl);
      self.map.setReports(self.state.reports);
      self.map.setUser(self.state.position);
      self.map.setDestination(self.state.destination);
      var route = self.state.routes[self.state.routeIndex];
      if (route) { self.map.setRoute(route, self.state.routes.slice(1)); self.map.fitCoordinates(route.coordinates); }
    }, 0);
  };

  GoApp.prototype.handleDestinationInput = function (event) {
    var self = this, value = event.target.value;
    clearTimeout(this.searchTimer);
    this.setState({destinationQuery:value, destination:null, suggestions:[], routes:[]});
    if (value.trim().length < 2) return;
    this.searchTimer = setTimeout(function () { self.searchPlaces(value); }, 350);
  };

  GoApp.prototype.searchPlaces = function (query) {
    var self = this;
    this.setState({searching:true});
    this.api('geocode', {params:{q:query, lang:this.state.lang, country:this.state.navCountry === 'ALL' ? '' : this.state.navCountry.toLowerCase()}}).then(function (data) {
      self.setState({suggestions:data.results || [], searching:false});
    }).catch(function (error) {
      self.setState({searching:false, suggestions:[]}); self.showToast(error.message, true);
    });
  };

  GoApp.prototype.selectSuggestion = function (place) {
    var self = this;
    var destination = {lat:Number(place.lat), lon:Number(place.lon), label:place.label};
    this.setState({destination:destination, destinationQuery:place.label, suggestions:[]}, function () {
      if (self.map) { self.map.setDestination(destination); self.map.setView(destination, 14); }
      self.locate(true).then(function (origin) { return self.buildRoute(origin, destination); }).catch(function (error) { self.showToast(error.message || self.t('locationDenied'), true); });
    });
  };

  GoApp.prototype.locate = function (silent) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error(self.t('locationDenied'))); return; }
      if (!silent) self.showToast(self.t('locating'));
      navigator.geolocation.getCurrentPosition(function (position) {
        var point = {
          lat:position.coords.latitude, lon:position.coords.longitude, accuracy:position.coords.accuracy,
          speed:position.coords.speed, heading:position.coords.heading, timestamp:position.timestamp
        };
        self.setState({origin:point, position:point}, function () {
          if (self.map) { self.map.setUser(point); self.map.setView(point, 15); }
          self.loadReports();
        });
        resolve(point);
      }, function () { reject(new Error(self.t('locationDenied') + ' ' + self.t('permissionHelp'))); }, {enableHighAccuracy:!self.lowPowerMode, timeout:self.lowPowerMode?18000:12000, maximumAge:self.lowPowerMode?30000:15000});
    });
  };

  GoApp.prototype.buildRoute = function (origin, destination, reroute) {
    var self = this;
    if (!origin || !destination) return Promise.reject(new Error(this.t('routeFailed')));
    this.setState({routing:!reroute, rerouting:!!reroute});
    return this.api('route', {params:{fromLat:origin.lat, fromLon:origin.lon, toLat:destination.lat, toLon:destination.lon}}).then(function (data) {
      var routes = data.routes || [];
      if (!routes.length) throw new Error(self.t('routeFailed'));
      self.routeProgress = null;
      self.setState({routes:routes, routeIndex:0, routing:false, rerouting:false}, function () {
        if (self.map) {
          self.map.setRoute(routes[0], routes.slice(1));
          if (reroute) {
            var followPoint = self.state.position || origin;
            if (followPoint) self.map.setView(followPoint, self.state.travelMode === 'car' ? 16 : 17);
          } else self.map.fitCoordinates(routes[0].coordinates);
        }
        if (!reroute) self.showToast(self.t('routeReady'));
      });
      return routes[0];
    }).catch(function (error) {
      self.setState({routing:false, rerouting:false});
      if (!reroute) self.showToast(error.message || self.t('routeFailed'), true);
      throw error;
    });
  };

  GoApp.prototype.selectRoute = function (index) {
    var route = this.state.routes[index];
    if (!route) return;
    this.setState({routeIndex:index}, function () { if (this.map) { this.map.setRoute(route, this.state.routes.filter(function (_, i) { return i !== index; })); this.map.fitCoordinates(route.coordinates); } });
  };

  GoApp.prototype.startNavigation = function () {
    var self = this, route = this.state.routes[this.state.routeIndex];
    if (!route || !this.state.destination) { this.showToast(this.t('noRoute'), true); return; }
    this.locate(true).then(function (point) {
      self.setState({navigating:true, follow:true, position:point, remainingDistance:route.distance, remainingDuration:route.duration}, function () {
        if (self.map) self.map.setView(point, 16);
        self.requestWakeLock();
        self.watchId = navigator.geolocation.watchPosition(self.handlePosition, function () {
          self.showToast(self.t('locationDenied'), true);
        }, {enableHighAccuracy:true, maximumAge:1500, timeout:15000});
      });
    }).catch(function (error) { self.showToast(error.message, true); });
  };

  GoApp.prototype.stopNavigation = function () {
    if (this.watchId != null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
    if (this.wakeLockSentinel && !this.state.keepAwake) { try { this.wakeLockSentinel.release(); } catch (_) {} this.wakeLockSentinel = null; }
    this.offRouteSince = null;
    this.setState({navigating:false, wakeLock:false, rerouting:false, currentStep:null, remainingDistance:null, remainingDuration:null});
  };

  GoApp.prototype.handlePosition = function (position) {
    var point = {
      lat:position.coords.latitude, lon:position.coords.longitude, accuracy:position.coords.accuracy,
      speed:position.coords.speed, heading:position.coords.heading, timestamp:position.timestamp
    };
    var route = this.state.routes[this.state.routeIndex], patch = {position:point, origin:point};
    if (route && route.coordinates && route.coordinates.length > 1) {
      var nearest = nearestOnRoute(point, route.coordinates);
      if (nearest && nearest.total > 0) {
        var fraction = clamp(nearest.along / nearest.total, 0, 1);
        patch.remainingDistance = Math.max(0, route.distance * (1 - fraction));
        patch.remainingDuration = Math.max(0, route.duration * (1 - fraction));
        patch.currentStep = this.stepAtFraction(route, fraction);
        if (nearest.distance > 80) {
          if (!this.offRouteSince) this.offRouteSince = Date.now();
          if (Date.now() - this.offRouteSince > 8000 && Date.now() - this.lastRerouteAt > 45000 && !this.state.rerouting) this.rerouteFrom(point);
        } else {
          this.offRouteSince = null;
        }
      }
    }
    this.setState(patch, function () {
      if (this.map) {
        this.map.setUser(point);
        if (this.state.follow) this.map.setView(point, 16);
      }
    });
  };

  GoApp.prototype.stepAtFraction = function (route, fraction) {
    var steps = route.steps || [];
    if (!steps.length) return null;
    var target = route.distance * fraction, total = 0;
    for (var i = 0; i < steps.length; i += 1) {
      total += Number(steps[i].distance || 0);
      if (total >= target) return steps[i];
    }
    return steps[steps.length - 1];
  };

  GoApp.prototype.rerouteFrom = function (point) {
    var self = this;
    this.lastRerouteAt = Date.now();
    this.buildRoute(point, this.state.destination, true).then(function () { self.offRouteSince = null; }).catch(function () {});
  };

  GoApp.prototype.requestWakeLock = function () {
    var self = this;
    if (!('wakeLock' in navigator) || !navigator.wakeLock || !navigator.wakeLock.request) {
      this.setState({wakeLock:false}); return;
    }
    navigator.wakeLock.request('screen').then(function (sentinel) {
      self.wakeLockSentinel = sentinel; self.setState({wakeLock:true});
      sentinel.addEventListener('release', function () { self.setState({wakeLock:false}); });
    }).catch(function () { self.setState({wakeLock:false}); });
  };

  GoApp.prototype.currentInstruction = function () {
    var step = this.state.currentStep;
    if (!step) return this.t('instructionContinue');
    if (step.type === 'arrive') return this.t('instructionArrive');
    if (step.type === 'roundabout' || step.type === 'rotary') return this.t('instructionRoundabout');
    if ((step.modifier || '').indexOf('left') >= 0) return this.t('instructionLeft') + (step.name ? ' — ' + step.name : '');
    if ((step.modifier || '').indexOf('right') >= 0) return this.t('instructionRight') + (step.name ? ' — ' + step.name : '');
    if (step.modifier === 'straight') return this.t('instructionStraight') + (step.name ? ' — ' + step.name : '');
    return this.t('instructionContinue') + (step.name ? ' — ' + step.name : '');
  };

  GoApp.prototype.turnIcon = function () {
    var step = this.state.currentStep;
    if (!step) return '↑';
    if (step.type === 'arrive') return '●';
    if (step.type === 'roundabout' || step.type === 'rotary') return '↻';
    if ((step.modifier || '').indexOf('left') >= 0) return '↰';
    if ((step.modifier || '').indexOf('right') >= 0) return '↱';
    return '↑';
  };

  GoApp.prototype.loadRadioStations = function (country) {
    var self = this;
    localStorage.setItem('go-app-radio-country', country);
    this.setState({radioCountry:country, radioLoading:true, radioStations:[], radioSearch:'', radio63DirectoryResults:[], radio63DirectoryQuery:'', radio63DirectoryOpen:false});
    this.api('radio_stations', {params:{country:country}}).then(function (data) {
      self.setState({radioStations:data.stations || [], radioSource:data.source || '', radioLoading:false});
    }).catch(function (error) {
      self.setState({radioLoading:false}); self.showToast(error.message, true);
    });
  };

  function radio63LooksLikeHls(url) {
    var value=String(url||'').toLowerCase();
    return /\.m3u8(?:$|[?#])/.test(value) || value.indexOf('ihrhls')>=0 || value.indexOf('/hls/')>=0 || value.indexOf('hls-live')>=0 || value.indexOf('playlist.m3u8')>=0;
  }

  GoApp.prototype.buildStreamCandidates = function (station) {
    var direct = Array.isArray(station.urls) ? station.urls : [];
    var relays = Array.isArray(station.relayUrls) ? station.relayUrls : [];
    var candidates = [];
    direct.forEach(function (url, index) {
      var relay = relays[index], parsed = null, isHls=radio63LooksLikeHls(url);
      try { parsed = new URL(url, window.location.href); } catch (_) {}
      var mixedContent = parsed && parsed.protocol === 'http:' && window.location.protocol === 'https:';
      if (mixedContent) {
        // A normal MP3/AAC stream can safely use our same-origin relay. HLS
        // manifests cannot be relayed by the byte-stream endpoint because their
        // segment URLs need playlist-aware rewriting.
        if (!isHls && relay) candidates.push({url:relay, mode:'relay', hls:false});
        return;
      }
      candidates.push({url:url, mode:'direct', hls:isHls});
      if (!isHls && relay) candidates.push({url:relay, mode:'relay', hls:false});
    });
    relays.slice(direct.length).forEach(function (url) { candidates.push({url:url, mode:'relay', hls:false}); });
    return candidates.filter(function (candidate, index, all) {
      return candidate.url && all.findIndex(function (item) { return item.url === candidate.url; }) === index;
    });
  };

  GoApp.prototype.playStation = function (station) {
    this.audioKind = 'radio';
    if (this.state.player.station && this.state.player.station.id === station.id) { this.togglePlayer(); return; }
    clearTimeout(this.reconnectTimer); clearTimeout(this.audioTimer);
    this.playerWanted = true; this.playerUrlIndex = 0; this.reconnectAttempt = 0;
    this.activeStation = station;
    this.playerCandidates = this.buildStreamCandidates(station);
    localStorage.setItem('go-app-last-station', JSON.stringify({id:station.id, name:station.name, country:station.country}));
    this.setState({player:{station:station, status:'connecting', playing:false, detail:''}});
    this.startStream(station);
    if ('mediaSession' in navigator && window.MediaMetadata) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({title:station.name, artist:station.country === 'LV' ? this.t('latvia') : this.t('unitedKingdom'), album:'go-app live radio', artwork:stationArtworkUrl(station) ? [{src:stationArtworkUrl(station)}] : [{src:'assets/icons/icon-512.png', sizes:'512x512', type:'image/png'}]});
      } catch (_) {}
    }
  };

  GoApp.prototype.startStream = function (stationOverride) {
    var self = this, station = stationOverride || this.activeStation || this.state.player.station;
    if (!station) { this.setPlayerState({status:'failed', playing:false}); return; }
    if (!this.playerCandidates.length) this.playerCandidates = this.buildStreamCandidates(station);
    if (!this.playerCandidates.length) { this.setPlayerState({status:'failed', playing:false, detail:this.t('radioTapAgain')}); return; }
    var candidate = this.playerCandidates[this.playerUrlIndex % this.playerCandidates.length];
    var attempt = ++this.streamAttempt, expected = attempt;
    this.failedStreamAttempt = -1;
    clearTimeout(this.audioTimer);
    this.setupAudio(attempt);
    this.setPlayerState({status:this.reconnectAttempt ? 'reconnecting' : 'connecting', playing:false, detail:candidate.mode === 'relay' ? this.t('radioRelay') : this.t('radioDirect')});
    var isHls=!!candidate.hls || radio63LooksLikeHls(candidate.url);
    var promise=null;
    if (isHls && this.audio.canPlayType && this.audio.canPlayType('application/vnd.apple.mpegurl')) {
      this.audio.src=candidate.url;
      this.audio.load();
      try { promise=this.audio.play(); } catch (_) { promise=null; }
    } else if (isHls && window.Hls && Hls.isSupported()) {
      try {
        this.hls=new Hls({enableWorker:true,lowLatencyMode:false,backBufferLength:30,maxBufferLength:30});
        this.hls.attachMedia(this.audio);
        this.hls.on(Hls.Events.MEDIA_ATTACHED,function(){
          if(expected!==self.streamAttempt||!self.playerWanted)return;
          self.hls.loadSource(candidate.url);
        });
        this.hls.on(Hls.Events.MANIFEST_PARSED,function(){
          if(expected!==self.streamAttempt||!self.playerWanted)return;
          var p=self.audio.play();
          if(p&&p.catch)p.catch(function(){if(self.playerWanted)self.radioFailure(attempt);});
        });
        this.hls.on(Hls.Events.ERROR,function(_,data){
          if(!data||!data.fatal||expected!==self.streamAttempt||!self.playerWanted)return;
          try {
            if(data.type===Hls.ErrorTypes.NETWORK_ERROR){self.hls.startLoad();return;}
            if(data.type===Hls.ErrorTypes.MEDIA_ERROR){self.hls.recoverMediaError();return;}
          } catch (_) {}
          self.radioFailure(attempt);
        });
      } catch (_) { self.radioFailure(attempt); }
    } else {
      this.audio.src=candidate.url;
      this.audio.load();
      try { promise=this.audio.play(); } catch (_) { promise=null; }
    }
    if (promise && promise.catch) promise.catch(function () { if (self.playerWanted) self.radioFailure(attempt); });
    this.audioTimer = setTimeout(function () { if (self.playerWanted && !self.state.player.playing) self.radioFailure(attempt); }, isHls ? 16000 : (candidate.mode === 'relay' ? 14000 : 10000));
  };

  GoApp.prototype.scheduleRadioFailure = function (delay, attempt) {
    var self = this, expected = attempt == null ? this.streamAttempt : attempt;
    clearTimeout(this.audioTimer);
    this.audioTimer = setTimeout(function () { if (self.playerWanted && !self.state.player.playing) self.radioFailure(expected); }, delay || 7000);
  };

  GoApp.prototype.radioFailure = function (attempt) {
    var self = this, station = this.activeStation || this.state.player.station;
    var expected = attempt == null ? this.streamAttempt : attempt;
    if (!this.playerWanted || !station || expected !== this.streamAttempt || this.failedStreamAttempt === expected) return;
    this.failedStreamAttempt = expected;
    clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer);
    if (this.playerUrlIndex + 1 < this.playerCandidates.length) {
      this.playerUrlIndex += 1;
      this.setPlayerState({status:'reconnecting', playing:false, detail:this.t('radioRetrying')});
      this.reconnectTimer = setTimeout(function () { self.startStream(); }, 500);
      return;
    }
    this.playerUrlIndex = 0;
    this.reconnectAttempt += 1;
    if (this.reconnectAttempt >= 2) {
      this.playerWanted = false;
      this.audio.pause();
      this.setPlayerState({status:'failed', playing:false, detail:this.t('radioTapAgain')});
      this.showToast(this.t('connectionFailed'), true);
      return;
    }
    var delays = [1500, 3500, 7000], delay = delays[Math.min(this.reconnectAttempt - 1, delays.length - 1)];
    this.setPlayerState({status:'reconnecting', playing:false, detail:Math.round(delay / 1000) + 's'});
    this.reconnectTimer = setTimeout(function () { if (self.playerWanted) self.startStream(); }, delay);
  };

  GoApp.prototype.pausePlayer = function () {
    this.playerWanted = false; clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer);
    if (this.hls) { try { this.hls.destroy(); } catch (_) {} this.hls=null; }
    if (this.audio) this.audio.pause();
    this.setPlayerState({status:'paused', playing:false, detail:''});
  };

  GoApp.prototype.resumePlayer = function () {
    if (!this.state.player.station) return;
    this.activeStation = this.state.player.station;
    this.playerCandidates = this.buildStreamCandidates(this.activeStation);
    this.playerUrlIndex = 0;
    this.reconnectAttempt = 0;
    this.playerWanted = true;
    this.startStream();
  };

  GoApp.prototype.togglePlayer = function () {
    if (this.state.player.playing || this.playerWanted) this.pausePlayer(); else this.resumePlayer();
  };

  GoApp.prototype.playerStatusLabel = function () {
    var status = this.state.player.status;
    if (status === 'playing') return this.t('playing');
    if (status === 'connecting') return this.t('connecting');
    if (status === 'buffering') return this.t('buffering');
    if (status === 'reconnecting') return this.t('reconnecting');
    if (status === 'failed') return this.t('connectionFailed');
    return this.t('paused');
  };

  GoApp.prototype.loadReports = function () {
    var self = this, position = this.state.position;
    this.api('reports', {params:position ? {lat:position.lat, lon:position.lon} : {}}).then(function (data) {
      self.setState({reports:data.reports || []});
      if (self.map) self.map.setReports(data.reports || []);
    }).catch(function () {});
  };

  GoApp.prototype.submitReport = function (event) {
    event.preventDefault();
    var self = this, formNode=event.currentTarget, captchaToken=this.captchaToken(formNode);
    var send = function (point) {
      self.setLoading(true);
      self.api('reports', {method:'POST', body:{type:self.state.reportType, note:self.state.reportNote, lat:point.lat, lon:point.lon, guestId:guestId(), captchaToken:captchaToken}}).then(function (data) {
        self.setState({loading:false, modal:null, reportNote:'', reports:[data.report].concat(self.state.reports)}); self.showToast(self.t('reportSent'));
      }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
    };
    if (this.state.position) send(this.state.position); else this.locate(true).then(send).catch(function (error) { self.showToast(error.message, true); });
  };

  GoApp.prototype.loadSavedPlaces = function () {
    var self = this;
    if (this.state.user) {
      this.api('saved_places').then(function (data) { self.setState({savedPlaces:data.places || []}); }).catch(function () {});
    } else {
      var rows = [];
      try { rows = JSON.parse(localStorage.getItem('go-app-saved-places') || '[]'); } catch (_) {}
      this.setState({savedPlaces:Array.isArray(rows) ? rows : []});
    }
  };

  GoApp.prototype.saveDestination = function (event) {
    event.preventDefault();
    var self = this, destination = this.state.destination;
    if (!destination) return;
    var values = new FormData(event.currentTarget), name = String(values.get('name') || '').trim();
    if (!name) return;
    var place = {id:'PLC-' + Date.now(), name:name, label:destination.label, lat:destination.lat, lon:destination.lon, createdAt:new Date().toISOString()};
    this.setLoading(true);
    if (this.state.user) {
      this.api('saved_places', {method:'POST', body:place}).then(function (data) {
        self.setState({loading:false, modal:null, savedPlaces:self.state.savedPlaces.concat([data.place])}); self.showToast(self.t('profileSync'));
      }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
    } else {
      var places = this.state.savedPlaces.concat([place]).slice(-100);
      localStorage.setItem('go-app-saved-places', JSON.stringify(places));
      this.setState({loading:false, modal:null, savedPlaces:places}); this.showToast(this.t('saved'));
    }
  };

  GoApp.prototype.deletePlace = function (place) {
    var self = this;
    if (this.state.user) {
      this.api('saved_places', {method:'DELETE', body:{id:place.id}}).then(function () {
        self.setState({savedPlaces:self.state.savedPlaces.filter(function (row) { return row.id !== place.id; })});
      }).catch(function (error) { self.showToast(error.message, true); });
    } else {
      var places = this.state.savedPlaces.filter(function (row) { return row.id !== place.id; });
      localStorage.setItem('go-app-saved-places', JSON.stringify(places)); this.setState({savedPlaces:places});
    }
  };

  GoApp.prototype.useSavedPlace = function (place) {
    var destination = {lat:Number(place.lat), lon:Number(place.lon), label:place.label || place.name};
    this.setState({view:'map', destination:destination, destinationQuery:destination.label, routes:[], modal:null}, function () {
      var self = this; self.initMapSoon();
      self.locate(true).then(function (origin) { return self.buildRoute(origin, destination); }).catch(function (error) { self.showToast(error.message, true); });
    });
  };

  GoApp.prototype.submitAuth = function (event) {
    event.preventDefault();
    this.unlockOrientation();
    var self = this, data = {}, form = new FormData(event.currentTarget);
    form.forEach(function (value, key) { data[key] = value; });
    data.language = this.state.lang;
    this.setLoading(true);
    if (this.state.authMode === 'register') {
      this.api('register', {method:'POST', body:data}).then(function () {
        self.setState({loading:false, authMode:'login'}); self.showToast(self.t('accountCreated'));
      }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
    } else {
      this.api('login', {method:'POST', body:data}).then(function (response) {
        var language = response.user && I18N[response.user.language] ? response.user.language : self.state.lang;
        self.setState({loading:false, user:response.user, csrf:response.csrfToken || self.state.csrf, entered:true, modal:null, lang:language}, function () { self.loadSavedPlaces(); if (self.state.keepAwake) self.requestWakeLock(); });
        localStorage.setItem('go-app-language', language); self.showToast(self.t('loginSuccess'));
      }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
    }
  };

  GoApp.prototype.logout = function () {
    var self = this;
    this.api('logout', {method:'POST'}).then(function (data) {
      self.setState({user:null, csrf:data.csrfToken || self.state.csrf, savedPlaces:[]}, function () { self.loadSavedPlaces(); });
      self.showToast(self.t('logoutSuccess'));
    }).catch(function (error) { self.showToast(error.message, true); });
  };

  GoApp.prototype.toggleKeepAwake = function () {
    var next = !this.state.keepAwake;
    localStorage.setItem('go-app-keep-awake', next ? 'true' : 'false');
    if (!next && this.wakeLockSentinel && !this.state.navigating) {
      try { this.wakeLockSentinel.release(); } catch (_) {}
      this.wakeLockSentinel = null;
      this.setState({keepAwake:false, wakeLock:false});
      return;
    }
    this.setState({keepAwake:next}, function () { if (next) this.requestWakeLock(); });
  };

  GoApp.prototype.resetMapView = function () {
    if (!this.map) return;
    var route = this.state.routes[this.state.routeIndex];
    if (route && route.coordinates && route.coordinates.length) {
      this.map.fitCoordinates(route.coordinates);
      this.setState({follow:false});
      return;
    }
    var point = this.state.position || this.state.origin;
    if (point) {
      this.map.setView(point, this.state.navigating ? 16 : 15);
      this.setState({follow:!!this.state.navigating});
      return;
    }
    this.map.setView(this.state.navCountry === 'LV' ? {lat:56.9496, lon:24.1052} : {lat:51.5074, lon:-0.1278}, this.state.navCountry === 'LV' ? 8 : 10);
    this.setState({follow:false});
  };

  GoApp.prototype.setUnits = function (units) {
    var next = units === 'mi' ? 'mi' : 'km';
    localStorage.setItem('go-app-units', next);
    this.setState({units:next});
  };

  GoApp.prototype.toggleUnits = function () {
    this.setUnits(this.state.units === 'km' ? 'mi' : 'km');
  };

  GoApp.prototype.installApp = function (platform) {
    var self = this;
    var target = platform || (isIOS() ? 'ios' : 'android');
    if (target === 'android' && this.state.installPrompt) {
      this.state.installPrompt.prompt();
      this.state.installPrompt.userChoice.then(function (choice) {
        self.setState({installPrompt:null, installPlatform:null});
        if (choice && choice.outcome === 'accepted') self.showToast(self.t('installReady'));
      });
    } else {
      this.setState({modal:'install', installPlatform:target});
    }
  };

  GoApp.prototype.renderLoading = function () {
    return h('div', {className:'app-loading'}, h('div', {className:'app-loading-card'},
      h('div', {className:'brand-mark'}, h('img', {src:'assets/icon.svg', alt:'go-app'})),
      h('strong', null, 'go-app'), h('div', {className:'spinner'})
    ));
  };

  GoApp.prototype.saveNavigationCache = function () {
    var hasDraft = !!(String(this.state.destinationQuery || '').trim() || String(this.state.searchQuery || '').trim() || this.state.destination || (this.state.searchResults || []).length || this.state.selectedPlace);
    try {
      if (!hasDraft) { localStorage.removeItem('go-app-navigation-cache'); return; }
      var data = {
        savedAt:Date.now(),
        destinationQuery:String(this.state.destinationQuery || '').slice(0, 500),
        searchQuery:String(this.state.searchQuery || '').slice(0, 500),
        searchResults:(this.state.searchResults || []).slice(0, 20),
        searchHasRun:!!this.state.searchHasRun,
        selectedPlace:this.state.selectedPlace || null,
        destination:this.state.destination || null,
        origin:this.state.origin || null,
        navCountry:this.state.navCountry
      };
      localStorage.setItem('go-app-navigation-cache', JSON.stringify(data));
    } catch (_) {}
  };

  GoApp.prototype.scheduleNavigationCache = function () {
    var self = this;
    clearTimeout(this.navigationCacheTimer);
    this.navigationCacheTimer = setTimeout(function () { self.saveNavigationCache(); }, 180);
  };

  GoApp.prototype.restoreNavigationCache = function () {
    var data = null;
    try { data = JSON.parse(localStorage.getItem('go-app-navigation-cache') || 'null'); } catch (_) {}
    if (!data || Date.now() - Number(data.savedAt || 0) > 7 * 24 * 3600000) return false;
    var country = NAV_COUNTRIES.indexOf(data.navCountry) >= 0 ? data.navCountry : this.state.navCountry;
    this.setState({
      destinationQuery:String(data.destinationQuery || ''),
      searchQuery:String(data.searchQuery || ''),
      searchResults:Array.isArray(data.searchResults) ? normalisePlaceResults(data.searchResults) : [],
      searchHasRun:!!data.searchHasRun,
      selectedPlace:data.selectedPlace || null,
      destination:data.destination || null,
      origin:data.origin || null,
      navCountry:country
    }, function () { if (this.state.view === 'map') this.initMapSoon(); });
    return true;
  };

  GoApp.prototype.renderWelcome = function () {
    var self = this;
    return h('main', {className:'welcome-shell'}, h('div', {className:'welcome-wrap'},
      h('header', {className:'welcome-brand'}, h('img', {src:'assets/icon.svg', alt:''}), h('div', null, h('h1', null, 'go-app'), h('p', null, this.t('brandTagline')))),
      h('section', {className:'hero-copy'}, h('span', {className:'eyebrow'}, this.t('heroEyebrow')), h('h2', null, this.t('heroTitle')), h('p', null, this.t('heroText'))),
      h('div', {className:'feature-row'},
        h('div', {className:'feature-chip'}, h('b', null, '➤'), h('span', null, this.t('featureNav'))),
        h('div', {className:'feature-chip'}, h('b', null, '◉'), h('span', null, this.t('featureRadio'))),
        h('div', {className:'feature-chip'}, h('b', {className:'dual-platform-icons'}, h('img', {src:'assets/icons/android.svg', alt:''}), h('img', {src:'assets/icons/apple.svg', alt:''})), h('span', null, this.t('featureInstall')))
      ),
      !this.state.installed && h(InstallPlatforms, {onInstall:this.installApp, t:this.t.bind(this)}),
      h('div', {className:'welcome-actions'},
        h(LanguageSwitch, {value:this.state.lang, onChange:this.setLanguage, t:this.t.bind(this)}),
        h('button', {className:'btn primary', type:'button', onClick:function () { self.setState({entered:true}, function () { if (self.state.keepAwake) self.requestWakeLock(); }); }}, '➤ ', this.t('continueGuest')),
        h('div', {className:'auth-inline'},
          h('button', {className:'btn secondary', type:'button', onClick:function () { self.setState({modal:'auth', authMode:'login'}); }}, this.t('signIn')),
          h('button', {className:'btn ghost', type:'button', onClick:function () { self.setState({modal:'auth', authMode:'register'}); }}, this.t('createAccount'))
        )
      ),
      h('p', {className:'legal-note'}, this.t('guestHint'))
    ));
  };

  GoApp.prototype.renderMapView = function () {
    var self = this, route = this.state.routes[this.state.routeIndex], playerActive = !!this.state.player.station;
    return h('section', {className:'app-view map-view'},
      h('div', {ref:function (node) { self.mapNode = node; }, className:'map-host'}),
      !this.state.navigating && h('div', {className:'map-search-panel'},
        h('div', {className:'map-search-card'},
          h('div', {className:'search-row'}, h('span', {className:'search-marker start'}, '●'),
            h('input', {value:this.t('currentLocation'), readOnly:true, 'aria-label':this.t('currentLocation')}),
            h(IconButton, {small:true, icon:h(AppIcon, {name:'locate', size:18}), title:this.t('recenter'), onClick:function () { self.locate(false).catch(function (error) { self.showToast(error.message, true); }); }})
          ),
          h('div', {className:'search-row'}, h('span', {className:'search-marker finish'}, '◆'),
            h('input', {className:'destination-input', type:'search', inputMode:'search', enterKeyHint:'search', autoComplete:'street-address', value:this.state.destinationQuery, onChange:this.handleDestinationInput, placeholder:this.t('destinationPlaceholder'), 'aria-label':this.t('destinationPlaceholder')}),
            h('button', {type:'button', className:'btn small ghost', onClick:function () {
              var country = self.state.navCountry === 'GB' ? 'LV' : 'GB'; localStorage.setItem('go-app-nav-country', country); self.setState({navCountry:country, suggestions:[]});
            }}, this.state.navCountry === 'GB' ? '🇬🇧' : '🇱🇻')
          )
        ),
        (this.state.searching || this.state.suggestions.length > 0) && h('div', {className:'suggestions'},
          this.state.searching ? h('div', {className:'empty-state'}, this.t('searching')) : this.state.suggestions.map(function (place) {
            return h('button', {type:'button', className:'suggestion', key:place.id, onClick:function () { self.selectSuggestion(place); }},
              h('span', {className:'suggestion-icon'}, h(AppIcon, {name:'locate', size:17})), h('span', null, h('b', null, place.label.split(',')[0]), h('span', null, place.label))
            );
          })
        )
      ),
      h('div', {className:'map-tools'},
        h(IconButton, {icon:h(AppIcon, {name:'zoomIn'}), title:this.t('zoomIn'), onClick:function () { if (self.map) self.map.setZoom(self.map.zoom + 1); }}),
        h(IconButton, {icon:h(AppIcon, {name:'zoomOut'}), title:this.t('zoomOut'), onClick:function () { if (self.map) self.map.setZoom(self.map.zoom - 1); }}),
        h(IconButton, {icon:h(AppIcon, {name:'locate'}), title:this.t('follow'), active:this.state.follow, onClick:function () {
          self.setState({follow:true}); if (self.state.position && self.map) self.map.setView(self.state.position, 16);
        }}),
        h(IconButton, {icon:h(AppIcon, {name:'reset'}), title:this.t('resetView'), onClick:this.resetMapView})
      ),
      !this.state.navigating && h('div', {className:'map-side-action'},
        h(IconButton, {icon:h(AppIcon, {name:'report'}), title:this.t('report'), onClick:function () { self.setState({modal:'report'}); }})
      ),
      this.state.navigating && this.renderNavigationHud(),
      route && !this.state.navigating && h('section',{className:'route-sheet with-nav'},
        h('div', {className:'route-summary'}, h('div', null, h('h3', null, this.t('routeReady')), h('p', null, this.state.destination ? this.state.destination.label : '')), h('span', {className:'eyebrow'}, this.state.routeIndex === 0 ? this.t('fastest') : '#' + (this.state.routeIndex + 1))),
        this.state.routes.length > 1 && h('div', {className:'radio-country-tabs', style:{marginTop:'12px', marginBottom:'0'}}, this.state.routes.map(function (item, index) {
          return h('button', {type:'button', key:item.id, className:self.state.routeIndex === index ? 'active' : '', onClick:function () { self.selectRoute(index); }}, formatDuration(item.duration, self.state.lang));
        })),
        h('div', {className:'route-stats'},
          h('div', {className:'route-stat'}, h('strong', null, formatDistance(route.distance, this.state.lang, this.state.units)), h('span', null, this.t('routeDistance'))),
          h('div', {className:'route-stat'}, h('strong', null, formatDuration(route.duration, this.state.lang)), h('span', null, this.t('routeTime')))
        ),
        h('div', {className:'route-actions'},
          h('button', {className:'btn primary', type:'button', onClick:this.startNavigation}, '➤ ', this.t('startNavigation')),
          h(IconButton, {icon:h(AppIcon, {name:'save'}), title:this.t('savePlace'), onClick:function () { self.setState({modal:'save'}); }})
        )
      ),
      !route && !this.state.navigating && this.state.routing && h('section',{className:'route-sheet with-nav'},h('div',{className:'empty-state'}, h('div', {className:'spinner'}), this.t('loading')))
    );
  };

  GoApp.prototype.renderNavigationHud = function () {
    var speed = formatSpeed(this.state.position && this.state.position.speed, this.state.units);
    var eta = this.state.remainingDuration != null ? new Date(Date.now() + this.state.remainingDuration * 1000) : null;
    return h('div', {className:'navigation-layer'},
      h('div', {className:'navigation-hud'},
        h('div', {className:'instruction-card'},
          h('div', {className:'turn-icon'}, this.turnIcon()),
          h('div', null, h('h3', null, this.state.rerouting ? this.t('rerouting') : this.currentInstruction()), h('p', null, this.state.wakeLock ? this.t('wakeLockOn') : this.t('wakeLockOff'))),
          h('div', {className:'speed-badge'}, h('strong', null, speed.value), h('small', null, speed.label))
        ),
        h('div', {className:'live-metrics'},
          h('div', {className:'live-metric'}, h('strong', null, formatDistance(this.state.remainingDistance, this.state.lang, this.state.units)), h('span', null, this.t('remaining'))),
          h('div', {className:'live-metric'}, h('strong', null, eta ? formatTime(eta, this.state.lang) : '—'), h('span', null, this.t('eta'))),
          h('div', {className:'live-metric'}, h('strong', null, speed.value + ' ' + speed.label), h('span', null, this.t('speed')))
        )
      ),
      h('div', {className:'exit-navigation'}, h('button', {type:'button', className:'btn danger small', onClick:this.stopNavigation}, '■ ', this.t('stopNavigation')))
    );
  };

  GoApp.prototype.renderRadioView = function () {
    var self = this, needle = this.state.radioSearch.trim().toLowerCase();
    var stations = this.state.radioStations.filter(function (station) {
      return !needle || (station.name + ' ' + (station.tags || '')).toLowerCase().indexOf(needle) >= 0;
    });
    var sourceLabel = this.state.radioSource === 'live' ? this.t('stationsLive') : (this.state.radioSource === 'built-in' ? this.t('stationsFallback') : this.t('stationsCache'));
    return h('section', {className:'app-view page-view'},
      h('header', {className:'page-header'}, h('div', null, h('span', {className:'eyebrow'}, 'go-app audio'), h('h1', null, this.t('radioTitle')), h('p', null, this.t('radioSubtitle')))),
      h('div', {className:'radio-country-tabs'},
        h('button', {type:'button', className:this.state.radioCountry === 'LV' ? 'active' : '', onClick:function () { self.loadRadioStations('LV'); }}, '🇱🇻 ' + this.t('latvia')),
        h('button', {type:'button', className:this.state.radioCountry === 'GB' ? 'active' : '', onClick:function () { self.loadRadioStations('GB'); }}, '🇬🇧 ' + this.t('unitedKingdom'))
      ),
      h('div', {className:'search-box'}, h('span', null, '⌕'), h('input', {value:this.state.radioSearch, onChange:function (event) { self.setState({radioSearch:event.target.value}); }, placeholder:this.t('searchStations'), 'aria-label':this.t('searchStations')})),
      h('p', {className:'radio-cache-note'}, '● ', sourceLabel, ' · ', stations.length, ' ', this.t('stationCount')),
      h('p', {className:'radio-cache-note'}, this.t('radioCacheNote')),
      this.state.radioLoading ? h('div', {className:'empty-state'}, h('div', {className:'spinner'}), this.t('loading')) :
        h('div', {className:'station-list'}, stations.length ? stations.map(function (station) {
          var current = self.state.player.station && self.state.player.station.id === station.id;
          return h('button', {type:'button', className:'station-card' + (current ? ' playing' : ''), key:station.id, onClick:function () { self.playStation(station); }},
            h(StationLogo, {station:station}),
            h('span', null, h('h3', null, station.name), h('p', null, [station.codec, station.bitrate ? station.bitrate + ' kbps' : '', station.tags].filter(Boolean).join(' · '))),
            h('span', {className:'play-circle'}, current && (self.state.player.playing || self.playerWanted) ? 'Ⅱ' : '▶')
          );
        }) : h('div', {className:'empty-state'}, h('div', {className:'empty-icon'}, '📻'), this.t('noStations')))
    );
  };

  GoApp.prototype.renderReportsView = function () {
    var self = this;
    var labels = {traffic:'reportTraffic', roadwork:'reportRoadwork', hazard:'reportHazard', police:'reportPolice', camera:'reportCamera', closure:'reportClosure'};
    return h('section', {className:'app-view page-view'},
      h('header', {className:'page-header'},
        h('div', null, h('span', {className:'eyebrow'}, 'go-app community'), h('h1', null, this.t('reportsTitle')), h('p', null, this.t('reportsSubtitle'))),
        h(IconButton, {icon:'＋', title:this.t('addReport'), onClick:function () { self.setState({modal:'report'}); }})
      ),
      h('div', {className:'card-list'}, this.state.reports.length ? this.state.reports.map(function (report) {
        return h('article', {className:'panel report-card', key:report.id},
          h('div', {className:'report-icon'}, REPORT_ICONS[report.type] || '⚠'),
          h('div', null, h('h3', null, self.t(labels[report.type] || 'report')), h('p', null, report.note || self.t('reportLocation'))),
          h('time', null, timeAgo(report.createdAt, self.t.bind(self)))
        );
      }) : h('div', {className:'panel empty-state'}, h('div', {className:'empty-icon'}, '✓'), this.t('noReports')))
    );
  };

  GoApp.prototype.renderProfileView = function () {
    var self = this, user = this.state.user;
    return h('section', {className:'app-view page-view'},
      h('header', {className:'page-header'}, h('div', null, h('span', {className:'eyebrow'}, 'go-app'), h('h1', null, this.t('profileTitle')), h('p', null, this.state.online ? this.t('online') : this.t('offline')))),
      h('section', {className:'panel profile-hero'},
        h('div', {className:'avatar'}, initials(user ? user.fullName : 'Guest')),
        h('div', null, h('h2', null, user ? user.fullName : this.t('guestUser')), h('p', null, user ? user.email : this.t('guestHint')))
      ),
      !this.state.installed && h('section', {className:'panel install-card'},
        h('h3', null, this.t('installApp')), h('p', null, this.t('installDescription')),
        h(InstallPlatforms, {onInstall:this.installApp, t:this.t.bind(this)})
      ),
      h('div', {className:'section-title'}, h('div', null, h('h2', null, this.t('languageSetting')))),
      h(LanguageSwitch, {value:this.state.lang, onChange:this.setLanguage, t:this.t.bind(this)}),
      h('div', {className:'section-title'}, h('div', null, h('h2', null, this.t('unitsSetting')))),
      h('section', {className:'panel unit-setting-card'},
        h('div', {className:'unit-setting-copy'}, h('strong', null, this.state.units === 'mi' ? this.t('miles') : this.t('kilometres')), h('span', null, this.t('unitsDescription'))),
        h('div', {className:'unit-switch', role:'radiogroup', 'aria-label':this.t('unitsSetting')},
          h('button', {type:'button', role:'radio', 'aria-checked':this.state.units === 'km' ? 'true' : 'false', className:this.state.units === 'km' ? 'active' : '', onClick:function () { self.setUnits('km'); }}, h('strong', null, this.t('kilometres')), h('span', null, this.t('unitKm'))),
          h('button', {type:'button', role:'radio', 'aria-checked':this.state.units === 'mi' ? 'true' : 'false', className:this.state.units === 'mi' ? 'active' : '', onClick:function () { self.setUnits('mi'); }}, h('strong', null, this.t('miles')), h('span', null, this.t('unitMiles')))
        )
      ),
      h('div', {className:'section-title'}, h('div', null, h('h2', null, this.t('savedPlaces')), h('p', null, this.state.savedPlaces.length + ''))),
      h('div', {className:'card-list'}, this.state.savedPlaces.length ? this.state.savedPlaces.map(function (place) {
        return h('article', {className:'panel saved-place', key:place.id},
          h('div', {className:'setting-icon'}, '⌖'),
          h('button', {type:'button', style:{border:0,background:'transparent',color:'inherit',textAlign:'left',minWidth:0,padding:0}, onClick:function () { self.useSavedPlace(place); }}, h('h3', null, place.name), h('p', null, place.label)),
          h(IconButton, {small:true, icon:'×', title:self.t('delete'), onClick:function () { self.deletePlace(place); }})
        );
      }) : h('div', {className:'panel empty-state'}, this.t('noSavedPlaces'))),
      h('div', {className:'section-title'}, h('div', null, h('h2', null, this.t('account')))),
      h('section', {className:'panel settings-list'},
        h('div', {className:'setting-row'}, h('div', {className:'setting-icon'}, this.state.online ? '●' : '○'), h('div', {className:'setting-copy'}, h('strong', null, this.state.online ? this.t('online') : this.t('offline')), h('span', null, this.state.serviceWorkerReady ? this.t('cacheReady') : this.t('loading'))), h('span', {className:'setting-value'}, 'PWA')),
        h('button', {type:'button', className:'setting-row', onClick:function () { self.toggleKeepAwake(); }}, h('div', {className:'setting-icon'}, '☀'), h('div', {className:'setting-copy'}, h('strong', null, this.t('keepAwakeSetting')), h('span', null, this.t('keepAwakeDescription'))), h('span', {className:'setting-value'}, this.state.keepAwake ? this.t('enabled') : this.t('disabled'))),
        h('div', {className:'setting-row'}, h('div', {className:'setting-icon'}, '{}'), h('div', {className:'setting-copy'}, h('strong', null, this.t('dataMode')), h('span', null, this.t('appVersion') + ' ' + (document.getElementById('go-app-root').dataset.version || '1.0.0'))), h('span', {className:'setting-value'}, 'JSON')),
        user ? h('button', {type:'button', className:'setting-row', onClick:function () { self.logout(); }}, h('div', {className:'setting-icon'}, '↪'), h('div', {className:'setting-copy'}, h('strong', null, this.t('signOut')), h('span', null, user.email)), h('span', {className:'setting-value'}, '›')) :
          h('button', {type:'button', className:'setting-row', onClick:function () { self.setState({modal:'auth', authMode:'login'}); }}, h('div', {className:'setting-icon'}, '♙'), h('div', {className:'setting-copy'}, h('strong', null, this.t('signIn')), h('span', null, this.t('createAccount'))), h('span', {className:'setting-value'}, '›'))
      )
    );
  };

  GoApp.prototype.renderPlayer = function () {
    var station = this.state.player.station;
    if (!station) return null;
    return h('section', {className:'player-bar'},
      h(StationLogo, {station:station}),
      h('div', {className:'player-info'}, h('strong', null, station.name), h('span', null, this.playerStatusLabel() + (this.state.player.detail ? ' · ' + this.state.player.detail : ''))),
      h('button', {type:'button', className:'icon-btn small active', onClick:this.togglePlayer, 'aria-label':this.state.player.playing ? this.t('paused') : this.t('playing')}, this.state.player.playing || this.playerWanted ? 'Ⅱ' : '▶')
    );
  };

  GoApp.prototype.renderBottomNav = function () {
    var self = this;
    var items = [
      {view:'map', icon:'map', label:'navMap'}, {view:'radio', icon:'radio', label:'navRadio'},
      {view:'reports', icon:'report', label:'navReports'}, {view:'profile', icon:'profile', label:'navProfile'}
    ];
    return h('nav', {className:'bottom-nav', 'aria-label':'go-app'}, items.map(function (item) {
      return h('button', {type:'button', key:item.view, className:self.state.view === item.view ? 'active' : '', onClick:function () { self.setView(item.view); }},
        item.view === 'radio' && self.state.player.playing && h('i', {className:'playing-dot'}),
        h('span', {className:'nav-icon'}, h(AppIcon, {name:item.icon, size:21})), h('span', null, self.t(item.label))
      );
    }));
  };

  GoApp.prototype.renderAuthModal = function () {
    var self = this, register = this.state.authMode === 'register';
    return h(Modal, {title:register ? this.t('registerTitle') : this.t('loginTitle'), closeLabel:this.t('close'), onClose:this.dismissModal},
      h('div', {className:'radio-country-tabs'},
        h('button', {type:'button', className:!register ? 'active' : '', onClick:function () { self.setState({authMode:'login'}); }}, this.t('signIn')),
        h('button', {type:'button', className:register ? 'active' : '', onClick:function () { self.setState({authMode:'register'}); }}, this.t('createAccount'))
      ),
      h('form', {className:'form-grid', onSubmit:this.submitAuth},
        register && h('label', {className:'field'}, h('span', null, this.t('fullName')), h('input', {name:'fullName', required:true, minLength:2, maxLength:120, autoComplete:'name'})),
        h('label', {className:'field'}, h('span', null, this.t('email')), h('input', {name:'email', type:'email', required:true, maxLength:190, autoComplete:'email'})),
        h('label', {className:'field'}, h('span', null, this.t('password')), h('input', {name:'password', type:'password', required:true, minLength:8, autoComplete:register ? 'new-password' : 'current-password'})),
        h('div', {className:'form-actions'}, h('button', {type:'button', className:'btn ghost', onClick:this.dismissModal}, this.t('cancel')), h('button', {type:'submit', className:'btn primary'}, register ? this.t('submitRegister') : this.t('submitLogin')))
      )
    );
  };

  GoApp.prototype.renderReportModal = function () {
    var self = this, types = ['traffic','roadwork','hazard','police','camera','closure'];
    var labels = {traffic:'reportTraffic', roadwork:'reportRoadwork', hazard:'reportHazard', police:'reportPolice', camera:'reportCamera', closure:'reportClosure'};
    return h(Modal, {title:this.t('addReport'), closeLabel:this.t('close'), onClose:this.dismissModal},
      h('form', {className:'form-grid', onSubmit:this.submitReport}, h('p', {className:'modal-note'}, this.t('reportLocation')), h('span', {className:'eyebrow'}, this.t('chooseType')),
        h('div', {className:'report-type-grid'}, types.map(function (type) { return h('button', {type:'button', key:type, className:'report-type' + (self.state.reportType === type ? ' active' : ''), onClick:function () { self.setState({reportType:type}); }}, h('b', null, REPORT_ICONS[type]), h('span', null, self.t(labels[type]))); })),
        h('label', {className:'field'}, h('span', null, this.t('reportNote')), h('textarea', {rows:3, maxLength:280, value:this.state.reportNote, onChange:function (event) { self.setState({reportNote:event.target.value}); }})),
        this.state.captcha&&this.state.captcha.enabled?h('div',{className:'go-hcaptcha','data-rendered':'0'}):null,
        h('div', {className:'form-actions'}, h('button', {type:'button', className:'btn ghost', onClick:this.dismissModal}, this.t('cancel')), h('button', {type:'submit', className:'btn primary'}, this.t('sendReport')))
      )
    );
  };

  GoApp.prototype.renderSaveModal = function () {
    return h(Modal, {title:this.t('saveDestination'), closeLabel:this.t('close'), onClose:this.dismissModal},
      h('form', {className:'form-grid', onSubmit:this.saveDestination},
        h('p', {className:'modal-note'}, this.state.destination ? this.state.destination.label : ''),
        h('label', {className:'field'}, h('span', null, this.t('placeName')), h('input', {name:'name', required:true, maxLength:80, autoFocus:true})),
        h('div', {className:'form-actions'}, h('button', {type:'button', className:'btn ghost', onClick:this.dismissModal}, this.t('cancel')), h('button', {type:'submit', className:'btn primary'}, this.t('save')))
      )
    );
  };

  GoApp.prototype.renderInstallModal = function () {
    var self = this, ios = this.state.installPlatform ? this.state.installPlatform === 'ios' : isIOS();
    return h(Modal, {className:'install-modal-card', title:ios ? this.t('iosInstallTitle') : this.t('androidInstallTitle'), closeLabel:this.t('close'), onClose:this.dismissModal},
      h('div', {className:'install-modal-brand'}, h('img', {src:ios ? 'assets/icons/apple.svg' : 'assets/icons/android.svg', alt:'', width:'48', height:'48'}), h('div',null,h('strong', null, ios ? this.t('installApple') : this.t('installAndroid')),h('small',null,this.t('installDescription')))),
      ios ? h('div', {className:'ios-steps'}, h('div', {className:'ios-step'}, h('b',null,'1'),h('p', null, this.t('iosStep1'))), h('div', {className:'ios-step'}, h('b',null,'2'),h('p', null, this.t('iosStep2'))), h('div', {className:'ios-step'},h('b',null,'3'), h('p', null, this.t('iosStep3')))) : h('div', null,h('p', {className:'modal-note'}, this.t('androidInstallText')),this.state.installPrompt ? h('button', {type:'button', className:'btn primary wide install-confirm', onClick:function () { self.installApp('android'); }}, this.t('installAndroid')) : h('p',{className:'install-browser-note'},this.t('installHelp'))),
      h('button', {type:'button', className:'btn ghost wide', onClick:this.dismissModal}, this.t('close'))
    );
  };

  GoApp.prototype.renderModal = function () {
    if (this.state.modal === 'auth') return this.renderAuthModal();
    if (this.state.modal === 'report') return this.renderReportModal();
    if (this.state.modal === 'save') return this.renderSaveModal();
    if (this.state.modal === 'install') return this.renderInstallModal();
    return null;
  };

  GoApp.prototype.renderApp = function () {
    var view;
    if (this.state.view === 'radio') view = this.renderRadioView();
    else if (this.state.view === 'reports') view = this.renderReportsView();
    else if (this.state.view === 'profile') view = this.renderProfileView();
    else view = this.renderMapView();
    var showPlayer = this.state.player.station && (this.state.view !== 'map' || (!this.state.navigating && !this.state.routes.length));
    return h('main', {className:'app-shell'},
      h('div', {className:'app-content'}, view),
      showPlayer && this.renderPlayer(),
      this.renderBottomNav(),
      this.renderModal(),
      this.state.toast && h('div', {className:'toast show' + (this.state.toastError ? ' error' : '')}, this.state.toast),
      this.state.loading && h('div', {className:'global-loader'}, h('div', {className:'spinner'}))
    );
  };


  /* go-app 2.2 feature layer */
  GoApp.prototype.setLanguage = function (language) {
    if (!I18N[language]) return;
    localStorage.setItem('go-app-language', language);
    this.setState({lang:language}, function () { this.loadNamedays(); });
    if (this.state.user) this.api('profile_language', {method:'POST', body:{language:language}}).catch(function () {});
  };

  GoApp.prototype.setView = function (view) {
    if (view !== 'map' && this.map) { this.map.destroy(); this.map = null; }
    this.setState({view:view, modal:null}, function () {
      if (view === 'map') this.initMapSoon();
      if (view === 'reports') this.loadReports();
      if (view === 'radio' && !this.state.radioStations.length) this.loadRadioStations(this.state.radioCountry);
    });
  };

  GoApp.prototype.setTravelMode = function (mode) {
    var self = this;
    if (['car','bike','walk'].indexOf(mode) < 0) return;
    localStorage.setItem('go-app-travel-mode', mode);
    this.setState({travelMode:mode}, function () {
      if (self.map) self.map.setMode(mode);
      if (self.state.destination && (self.state.position || self.state.origin)) {
        self.buildRoute(self.state.position || self.state.origin, self.state.destination, false).catch(function () {});
      }
      self.saveTrip();
    });
  };

  GoApp.prototype.setMapStyle = function (style) {
    var next = style === 'satellite' ? 'satellite' : 'road';
    localStorage.setItem('go-app-map-style', next);
    this.setState({mapStyle:next});
  };

  GoApp.prototype.buildRoute = function (origin, destination, reroute) {
    var self = this;
    if (!origin || !destination) return Promise.reject(new Error(this.t('routeFailed')));
    this.setState({routing:!reroute, rerouting:!!reroute});
    return this.api('route', {timeout:10000, params:{fromLat:origin.lat, fromLon:origin.lon, toLat:destination.lat, toLon:destination.lon, mode:this.state.travelMode}}).then(function (data) {
      var routes = data.routes || [];
      if (!routes.length) throw new Error(self.t('routeFailed'));
      self.routeProgress = null;
      self.setState({routes:routes, routeIndex:0, routing:false, rerouting:false}, function () {
        if (self.map) {
          self.map.setRoute(routes[0], routes.slice(1));
          if (reroute) {
            var followPoint = self.state.position || origin;
            if (followPoint) self.map.setView(followPoint, self.state.travelMode === 'car' ? 16 : 17);
          } else self.map.fitCoordinates(routes[0].coordinates);
        }
        self.saveTrip();
        if (!reroute) self.showToast(self.t('routeReady'));
      });
      return routes[0];
    }).catch(function (error) {
      self.setState({routing:false, rerouting:false});
      if (!reroute) self.showToast(error.message || self.t('routeFailed'), true);
      throw error;
    });
  };

  GoApp.prototype.selectSuggestion = function (place) {
    var self = this;
    var destination = {id:place.id, lat:Number(place.lat), lon:Number(place.lon), label:place.label || place.address || place.title, title:place.title || ''};
    this.setState({destination:destination, destinationQuery:destination.label, suggestions:[], routes:[], selectedPlace:place}, function () {
      self.locate(true).then(function (origin) { return self.buildRoute(origin, destination); }).catch(function (error) { self.showToast(error.message, true); });
    });
  };

  GoApp.prototype.handlePlaceSearch = function (event) {
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopPropagation) event.stopPropagation();
    var self = this, query = String(this.state.searchQuery || '').replace(/\s+/g, ' ').trim();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (query.length < 2) {
      this.setState({searchResults:[], searchLoading:false, searchHasRun:true, searchError:this.t('searchMinimum') || 'Enter at least two characters.'});
      return false;
    }
    var requestId = ++this.placeSearchSequence;
    this.setState({searchLoading:true, searchError:'', searchHasRun:true, selectedPlace:null});
    this.api('geocode', {timeout:16000, params:{q:query, lang:this.state.lang, country:String(this.state.navCountry || 'ALL').toLowerCase()}}).then(function (data) {
      if (requestId !== self.placeSearchSequence) return;
      var results = normalisePlaceResults(data.results);
      var warning = safePlaceText(data.warning);
      self.setState({
        searchLoading:false,
        searchResults:results,
        searchError:warning || (!results.length ? self.t('noResults') : '')
      });
    }).catch(function (error) {
      if (requestId !== self.placeSearchSequence) return;
      self.setState({searchLoading:false, searchResults:[], searchError:(error && error.message) || self.t('unknownError')});
      self.showToast((error && error.message) || self.t('unknownError'), true);
    });
    return false;
  };

  GoApp.prototype.openPlace = function (place) { this.setState({selectedPlace:place, modal:'place'}); };
  GoApp.prototype.navigateToSelected = function (place) {
    var self = this, target = place || this.state.selectedPlace;
    if (!target) return;
    var destination = {id:target.id, lat:Number(target.lat), lon:Number(target.lon), label:target.label || target.address || target.title, title:target.title || ''};
    this.setState({view:'map', modal:null, destination:destination, destinationQuery:destination.label, routes:[]}, function () {
      self.initMapSoon();
      self.locate(true).then(function (origin) { return self.buildRoute(origin, destination); }).catch(function (error) { self.showToast(error.message, true); });
    });
  };

  GoApp.prototype.loadNamedays = function () {
    var self = this;
    if (this.state.lang !== 'lv') { this.setState({namedays:[]}); return; }
    fetch('assets/namedays-lv.json', {cache:'force-cache'}).then(function (response) { return response.json(); }).then(function (calendar) {
      var now = new Date(), key = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      self.setState({namedays:Array.isArray(calendar[key]) ? calendar[key] : []});
    }).catch(function () { self.setState({namedays:[]}); });
  };

  GoApp.prototype.loadEnvironment = function (point, force) {
    var self = this;
    if (!point || !this.state.online) return;
    var now = Date.now();
    if (!force && now - this.lastEnvironmentLoad < 240000) return;
    this.lastEnvironmentLoad = now;
    var jobs = [];
    if (this.state.features.weather !== false) jobs.push(this.api('weather', {params:{lat:point.lat, lon:point.lon}}).then(function (data) { self.setState({weather:data.weather || null}, function () { self.updateSafetyAlert(); }); }).catch(function () {}));
    if (this.state.showNearby) jobs.push(this.api('nearby', {params:{lat:point.lat, lon:point.lon, radius:6500, kinds:'camera,fuel,parking'}}).then(function (data) { self.setState({nearby:data.items || []}, function () { self.updateSafetyAlert(); }); }).catch(function () {}));
    return Promise.all(jobs);
  };

  GoApp.prototype.updateSafetyAlert = function () {
    var point = this.state.position, alerts = [], self = this;
    if (!point) return;
    var camera = (this.state.nearby || []).filter(function (item) { return item.type === 'camera'; }).map(function (item) { return Object.assign({}, item, {actualDistance:haversine(point, item)}); }).sort(function (a,b) { return a.actualDistance-b.actualDistance; })[0];
    var traffic = (this.state.reports || []).filter(function (item) { return ['traffic','closure','roadwork','hazard','camera'].indexOf(item.type) >= 0 && isFinite(Number(item.lat)) && isFinite(Number(item.lon)); }).map(function (item) { return Object.assign({}, item, {actualDistance:haversine(point, {lat:Number(item.lat), lon:Number(item.lon)})}); }).sort(function (a,b) { return a.actualDistance-b.actualDistance; })[0];
    if (camera && camera.actualDistance < 2200) {
      var limitKmh = Number(camera.maxspeed || 0), speedKmh = Math.max(0, Number(point.speed || 0) * 3.6);
      alerts.push({type:'camera', title:this.t('cameraAhead'), distance:camera.actualDistance, limit:limitKmh || null, over:limitKmh > 0 && speedKmh > limitKmh + 3});
    }
    if (traffic && traffic.actualDistance < 3000) alerts.push({type:'traffic', title:this.t('trafficAhead'), distance:traffic.actualDistance});
    var weather = this.state.weather;
    if (weather && Array.isArray(weather.alerts) && weather.alerts.length) alerts.push({type:'weather', title:weather.alerts.map(function (entry) { var type = entry && entry.type ? entry.type : entry; return self.t(type === 'ice' ? 'iceWarning' : type === 'snow' ? 'snowWarning' : type === 'wind' ? 'windWarning' : String(type)); }).join(' · '), distance:null});
    alerts.sort(function (a,b) { return (a.distance == null ? 999999 : a.distance) - (b.distance == null ? 999999 : b.distance); });
    this.setState({activeAlert:alerts[0] || null});
  };

  GoApp.prototype.handlePosition = function (position) {
    var point = {lat:position.coords.latitude, lon:position.coords.longitude, accuracy:position.coords.accuracy, speed:position.coords.speed, heading:position.coords.heading, timestamp:position.timestamp};
    var route = this.state.routes[this.state.routeIndex], patch = {position:point, origin:point};
    if (route && route.coordinates && route.coordinates.length > 1) {
      var nearest = nearestOnRoute(point, route.coordinates);
      if (nearest && nearest.total > 0) {
        var fraction = clamp(nearest.along / nearest.total, 0, 1);
        patch.remainingDistance = Math.max(0, route.distance * (1 - fraction));
        patch.remainingDuration = Math.max(0, route.duration * (1 - fraction));
        patch.currentStep = this.stepAtFraction(route, fraction);
        if (nearest.distance > (this.state.travelMode === 'car' ? 80 : 45)) {
          if (!this.offRouteSince) this.offRouteSince = Date.now();
          if (Date.now() - this.offRouteSince > 4500 && Date.now() - this.lastRerouteAt > 18000 && !this.state.rerouting) this.rerouteFrom(point);
        } else this.offRouteSince = null;
      }
    }
    var self = this;
    this.setState(patch, function () {
      if (self.map && !self.state.navigating) {
        self.map.setUser(point);
        if (self.state.follow) {
          var now = Date.now();
          var moved = !self.lastFollowPoint || haversine(point, self.lastFollowPoint) > 12;
          if (!self.lastFollowPanAt || now - self.lastFollowPanAt > 1500 || moved) {
            self.map.setView(point, self.state.travelMode === 'car' ? 16 : 17);
            self.lastFollowPanAt = now;
            self.lastFollowPoint = point;
          }
        }
      }
      self.loadEnvironment(point, false);
      self.updateSafetyAlert();
      self.saveTrip();
    });
  };

  GoApp.prototype.saveTrip = function () {
    if (!this.state.destination || !this.state.routes.length) return;
    var data = {savedAt:Date.now(), destination:this.state.destination, destinationQuery:this.state.destinationQuery, origin:this.state.origin, routes:this.state.routes, routeIndex:this.state.routeIndex, travelMode:this.state.travelMode, navigating:this.state.navigating, remainingDistance:this.state.remainingDistance, remainingDuration:this.state.remainingDuration};
    try { localStorage.setItem('go-app-active-trip', JSON.stringify(data)); } catch (_) {}
  };

  GoApp.prototype.restoreTrip = function () {
    var data = null;
    try { data = JSON.parse(localStorage.getItem('go-app-active-trip') || 'null'); } catch (_) {}
    if (!data || !data.destination || !Array.isArray(data.routes) || !data.routes.length || Date.now() - Number(data.savedAt || 0) > 7 * 24 * 3600000) return false;
    var mode = ['car','bike','walk'].indexOf(data.travelMode) >= 0 ? data.travelMode : this.state.travelMode;
    var routeIndex = Math.max(0, Math.min(data.routes.length - 1, Number(data.routeIndex || 0)));
    this.setState({destination:data.destination, destinationQuery:data.destinationQuery || data.destination.label || '', origin:data.origin || null, routes:data.routes, routeIndex:routeIndex, travelMode:mode, remainingDistance:data.remainingDistance, remainingDuration:data.remainingDuration, resumeTrip:!!data.navigating}, function () {
      this.showToast(this.t('routeRestored'));
      this.initMapSoon();
    });
    return true;
  };

  GoApp.prototype.startNavigation = function () {
    var self = this, route = this.state.routes[this.state.routeIndex];
    if (!route || !this.state.destination) { this.showToast(this.t('noRoute'), true); return; }
    this.locate(true).then(function (point) {
      if (self.watchId != null) navigator.geolocation.clearWatch(self.watchId);
      self.setState({navigating:true, resumeTrip:false, follow:true, position:point, remainingDistance:self.state.remainingDistance == null ? route.distance : self.state.remainingDistance, remainingDuration:self.state.remainingDuration == null ? route.duration : self.state.remainingDuration}, function () {
        if (self.map) self.map.setView(point, self.state.travelMode === 'car' ? 16 : 17);
        self.requestWakeLock(); self.loadEnvironment(point, true); self.saveTrip();
        var driving = self.state.travelMode === 'car';
        self.watchId = navigator.geolocation.watchPosition(self.handlePosition, function () { self.showToast(self.t('locationDenied'), true); }, {enableHighAccuracy:driving || !self.lowPowerMode, maximumAge:driving?750:(self.lowPowerMode?3000:1200), timeout:self.lowPowerMode?22000:15000});
      });
    }).catch(function (error) { self.showToast(error.message, true); });
  };

  GoApp.prototype.stopNavigation = function (after) {
    if (this.watchId != null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
    if (this.wakeLockSentinel && !this.state.keepAwake) { try { this.wakeLockSentinel.release(); } catch (_) {} this.wakeLockSentinel = null; }
    this.offRouteSince = null;
    try { localStorage.removeItem('go-app-active-trip'); } catch (_) {}
    this.setState({navigating:false, resumeTrip:false, wakeLock:false, rerouting:false, currentStep:null, remainingDistance:null, remainingDuration:null, activeAlert:null}, typeof after === 'function' ? after : undefined);
  };

  GoApp.prototype.exitNavigationTo = function (target) {
    var self = this;
    this.stopNavigation(function () {
      var clear = {routes:[], routeIndex:0, routing:false, destination:null, origin:null, suggestions:[], destinationQuery:'', remainingDistance:null, remainingDuration:null, currentStep:null, activeAlert:null};
      if (target === 'search') {
        clear.view = 'search';
        clear.entered = true;
      } else {
        clear.view = 'map';
        clear.entered = false;
      }
      self.setState(clear, function () {
        if (self.map) { try { self.map.destroy(); } catch (_) {} self.map = null; }
      });
    });
  };

  GoApp.prototype.renderCaptchaSoon = function () {
    var self = this;
    if (!this.state.captcha || !this.state.captcha.enabled || !this.state.captcha.siteKey) return;
    if (!window.hcaptcha) { clearTimeout(this.captchaTimer); this.captchaTimer = setTimeout(function () { self.renderCaptchaSoon(); }, 500); return; }
    setTimeout(function () {
      document.querySelectorAll('.go-hcaptcha[data-rendered="0"]').forEach(function (node) {
        try { window.hcaptcha.render(node, {sitekey:self.state.captcha.siteKey}); node.dataset.rendered = '1'; } catch (_) {}
      });
    }, 40);
  };

  GoApp.prototype.captchaToken = function (form) {
    var field = form && form.querySelector('[name="h-captcha-response"]');
    return field ? field.value : '';
  };

  GoApp.prototype.submitAuth = function (event) {
    event.preventDefault();
    var self = this, data = {}, formNode = event.currentTarget, form = new FormData(formNode);
    form.forEach(function (value, key) { data[key] = value; });
    data.language = this.state.lang; data.requestPro = !!formNode.querySelector('[name="requestPro"]:checked'); data.captchaToken = this.captchaToken(formNode);
    this.setLoading(true);
    if (this.state.authMode === 'register') {
      this.api('register', {method:'POST', body:data}).then(function (response) {
        self.setState({loading:false, authMode:'login'}); self.showToast(response.pendingApproval ? self.t('pendingApproval') : self.t('accountCreated'));
        if (window.hcaptcha) try { window.hcaptcha.reset(); } catch (_) {}
      }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
    } else {
      data.login = data.email;
      this.api('login', {method:'POST', body:data}).then(function (response) {
        var language = response.user && I18N[response.user.language] ? response.user.language : self.state.lang;
        self.setState({loading:false, user:response.user, csrf:response.csrfToken || self.state.csrf, entered:true, modal:null, lang:language}, function () { self.loadSavedPlaces(); if (self.state.keepAwake) self.requestWakeLock(); });
        localStorage.setItem('go-app-language', language); self.showToast(self.t('loginSuccess'));
      }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
    }
  };

  GoApp.prototype.submitFeedback = function (event) {
    event.preventDefault();
    var self = this, formNode = event.currentTarget, data = {};
    new FormData(formNode).forEach(function (value, key) { data[key] = value; });
    data.captchaToken = this.captchaToken(formNode);
    this.setLoading(true);
    this.api('feedback', {method:'POST', body:data}).then(function () {
      self.setState({loading:false, modal:null}); self.showToast(self.t('feedbackSent'));
    }).catch(function (error) { self.setLoading(false); self.showToast(error.message, true); });
  };

  GoApp.prototype.handleLocalFiles = function (event) {
    var files = Array.prototype.slice.call(event.target.files || []).filter(function (file) { return file.type.indexOf('audio/') === 0 || /\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(file.name); });
    this.setState({localTracks:files.map(function (file, index) { return {id:'local-' + index + '-' + file.lastModified, name:file.name.replace(/\.[^.]+$/, ''), file:file}; })});
    if (files.length) this.playLocalTrack(0);
  };

  GoApp.prototype.playLocalTrack = function (index) {
    var self = this, track = this.state.localTracks[index];
    if (!track) return;
    clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer); this.playerWanted = false; this.audioKind = 'local';
    if (this.localObjectUrl) URL.revokeObjectURL(this.localObjectUrl);
    this.localObjectUrl = URL.createObjectURL(track.file);
    this.setupAudio(this.streamAttempt + 1); this.streamAttempt += 1;
    this.audio.src = this.localObjectUrl; this.audio.preload = 'metadata';
    this.audio.addEventListener('ended', function () { if (self.audioKind === 'local' && self.state.localTrackIndex + 1 < self.state.localTracks.length) self.playLocalTrack(self.state.localTrackIndex + 1); });
    this.setState({localTrackIndex:index, player:{station:{id:track.id, name:track.name, country:'LOCAL', favicon:''}, status:'connecting', playing:false, detail:'', kind:'local'}}, function () {
      var promise = self.audio.play(); if (promise && promise.catch) promise.catch(function (error) { self.showToast(error.message, true); });
    });
  };

  var goResumeRadioPlayer = GoApp.prototype.resumePlayer;
  GoApp.prototype.resumePlayer = function () {
    if (this.audioKind === 'local') {
      var self = this, promise = this.audio && this.audio.play(); if (promise && promise.catch) promise.catch(function (error) { self.showToast(error.message, true); }); return;
    }
    goResumeRadioPlayer.call(this);
  };
  GoApp.prototype.togglePlayer = function () {
    if (this.audioKind === 'local') {
      if (!this.audio) return;
      if (!this.audio.paused) { this.audio.pause(); this.setPlayerState({status:'paused', playing:false}); }
      else this.resumePlayer();
      return;
    }
    if (this.state.player.playing || this.playerWanted) this.pausePlayer(); else this.resumePlayer();
  };
  GoApp.prototype.stopPlayer = function () {
    this.playerWanted = false; clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer);
    if (this.audio) { try { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); } catch (_) {} }
    if (this.localObjectUrl) { URL.revokeObjectURL(this.localObjectUrl); this.localObjectUrl = null; }
    this.audioKind = 'radio'; this.activeStation = null; this.playerCandidates = [];
    this.setState({player:{station:null,status:'paused',playing:false,detail:'',kind:'radio'}, localTrackIndex:-1});
  };

  function goBase64Url(bytes) { return btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  GoApp.prototype.startSpotifyConnect = function () {
    var self = this, config = this.state.spotifyConfig || {};
    if (!this.state.user || this.state.user.plan !== 'pro') { this.showToast(this.t('proOnly'), true); return; }
    if (!config.enabled || !config.clientId) { this.showToast('Spotify is not configured by the administrator.', true); return; }
    var verifierBytes = new Uint8Array(64); crypto.getRandomValues(verifierBytes); var verifier = goBase64Url(verifierBytes);
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (buffer) {
      var challenge = goBase64Url(new Uint8Array(buffer));
      var redirectUri = config.redirectUri || (location.origin + location.pathname + '?view=radio');
      sessionStorage.setItem('go-app-spotify-verifier', verifier); sessionStorage.setItem('go-app-spotify-redirect', redirectUri);
      var url = new URL('https://accounts.spotify.com/authorize');
      url.searchParams.set('client_id', config.clientId); url.searchParams.set('response_type','code'); url.searchParams.set('redirect_uri',redirectUri);
      url.searchParams.set('scope','user-read-playback-state user-modify-playback-state user-read-currently-playing'); url.searchParams.set('code_challenge_method','S256'); url.searchParams.set('code_challenge',challenge);
      location.href = url.toString();
    }).catch(function (error) { self.showToast(error.message, true); });
  };
  GoApp.prototype.handleSpotifyCallback = function () {
    var self = this, params = new URLSearchParams(location.search), code = params.get('code'), verifier = sessionStorage.getItem('go-app-spotify-verifier');
    if (!code || !verifier) { if (this.state.user && this.state.user.plan === 'pro') this.loadSpotifyStatus(); return; }
    var redirectUri = sessionStorage.getItem('go-app-spotify-redirect') || (location.origin + location.pathname + '?view=radio');
    this.api('spotify_exchange', {method:'POST', body:{code:code, verifier:verifier, redirectUri:redirectUri}}).then(function () {
      sessionStorage.removeItem('go-app-spotify-verifier'); sessionStorage.removeItem('go-app-spotify-redirect'); history.replaceState({}, '', location.pathname + '?view=radio');
      self.setState({view:'radio', mediaTab:'spotify'}); self.loadSpotifyStatus(); self.showToast('Spotify connected.');
    }).catch(function (error) { self.showToast(error.message, true); });
  };
  GoApp.prototype.loadSpotifyStatus = function () {
    var self = this;
    if (!this.state.user || this.state.user.plan !== 'pro') return;
    this.setState({spotifyLoading:true});
    this.api('spotify_status').then(function (data) { self.setState({spotifyLoading:false, spotifyStatus:data}); }).catch(function () { self.setState({spotifyLoading:false}); });
  };
  GoApp.prototype.spotifyControl = function (command) {
    var self = this;
    this.api('spotify_control', {method:'POST', body:{command:command}}).then(function () { setTimeout(function () { self.loadSpotifyStatus(); }, 500); }).catch(function (error) { self.showToast(error.message, true); });
  };
  GoApp.prototype.disconnectSpotify = function () {
    var self = this;
    this.api('spotify_disconnect', {method:'POST'}).then(function () { self.setState({spotifyStatus:{connected:false,playback:null}}); }).catch(function (error) { self.showToast(error.message, true); });
  };

  GoApp.prototype.renderWelcome = function () {
    var self = this;
    return h('main', {className:'welcome-shell'},
      h('section', {className:'welcome-card'},
        h('a', {className:'admin-login-button', href:'?=admin', title:this.t('adminLogin'), 'aria-label':this.t('adminLogin')}, h(AppIcon,{name:'admin',size:20})),
        h('div', {className:'welcome-brand'}, h('img', {src:'assets/icons/icon-192.png', alt:'go-app'}), h('div', null, h('strong', null, 'go-app'), h('span', null, this.t('brandTagline')))),
        h('span', {className:'eyebrow'}, this.t('heroEyebrow')), h('h1', null, this.t('heroTitle')), h('p', {className:'hero-copy'}, this.t('heroText')),
        h('div', {className:'feature-pills'}, h('span', null, '⌖ ', this.t('featureNav')), h('span', null, '◉ ', this.t('featureRadio')), h('span', null, '＋ ', this.t('featureInstall'))),
        this.renderAdvertCard(true),
        h(LanguageSwitch, {value:this.state.lang, onChange:this.setLanguage, t:this.t.bind(this)}),
        h('button', {type:'button', className:'btn primary wide', onClick:function () { self.unlockOrientation(); self.setState({entered:true}); if (self.state.keepAwake) self.requestWakeLock(); }}, this.t('continueGuest')),
        h('div', {className:'welcome-actions'}, h('button', {type:'button', className:'btn ghost', onClick:function () { self.setState({modal:'auth',authMode:'login'}); }}, this.t('signIn')), h('button', {type:'button', className:'btn ghost', onClick:function () { self.setState({modal:'auth',authMode:'register'}); }}, this.t('createAccount'))),
        !this.state.installed ? h(InstallPlatforms, {onInstall:this.installApp, t:this.t.bind(this)}) : null,
        h('div',{className:'welcome-footer-actions'},h('button',{type:'button',className:'support-link',onClick:function(){self.setState({modal:'feedback'});}},this.t('contactUs')+' · '+this.t('feedback')),this.state.app.newsletter&&this.state.app.newsletter.enabled?h('button',{type:'button',className:'support-link newsletter-link',onClick:function(){self.setState({modal:'newsletter'});}},this.t('subscribeNews')):null)
      )
    );
  };

  GoApp.prototype.renderModeSelector = function () {
    var self = this;
    return h('div', {className:'mode-selector', role:'radiogroup', 'aria-label':this.t('travelMode')}, ['car','bike','walk'].map(function (mode) {
      return h('button', {type:'button', key:mode, className:self.state.travelMode === mode ? 'active' : '', onClick:function () { self.setTravelMode(mode); }, title:self.t(mode)}, h(AppIcon, {name:mode,size:20}), h('span', null, self.t(mode)));
    }));
  };

  GoApp.prototype.renderMapView = function () {
    var self = this, route = this.state.routes[this.state.routeIndex], playerActive = !!this.state.player.station;
    return h('section', {className:'app-view map-view'+(this.state.navigating?' is-navigating':'')},
      h('div', {className:'map-host', ref:function (node) { self.mapNode = node; }}),
      !this.state.navigating ? h('div', {className:'map-top-stack'},
        h('div', {className:'map-command-row'},
          this.renderModeSelector(),
          h('div', {className:'destination-search'}, h('span', {className:'search-pin'}, h(AppIcon,{name:'search',size:19})), h('input', {className:'destination-input', type:'search', inputMode:'search', enterKeyHint:'search', autoComplete:'street-address', value:this.state.destinationQuery, onChange:this.handleDestinationInput, placeholder:this.t('destinationPlaceholder'), 'aria-label':this.t('destinationPlaceholder')}), this.renderCountrySelect(true))
        ),
        (this.state.searching || this.state.suggestions.length) ? h('div', {className:'suggestions'}, this.state.searching ? h('div',{className:'empty-state'},this.t('searching')) : this.state.suggestions.map(function (place) { return h('button',{type:'button',className:'suggestion',key:place.id,onClick:function(){self.selectSuggestion(place);}},h('span',{className:'suggestion-icon'},h(AppIcon,{name:'pin',size:18})),h('span',null,h('b',null,place.title || String(place.label).split(',')[0]),h('span',null,place.address || place.label))); })) : null,
        h('div', {className:'map-status-row'},
          this.state.weather ? h('button',{type:'button',className:'status-chip weather-chip',onClick:function(){self.loadEnvironment(self.state.position||self.state.origin,true);}},'☁ ',Math.round(this.state.weather.temperature || 0),'°') : null,
          this.state.lang==='lv' && this.state.namedays.length ? h('span',{className:'status-chip nameday-chip'},'✦ ',this.t('todaysNamedays'),': ',this.state.namedays.join(', ')) : null,
          (this.state.destination || this.state.routes.length || this.state.searchResults.length) ? h('button',{type:'button',className:'status-chip back-search-chip',onClick:function(){self.setView('search');}},h(AppIcon,{name:'arrowLeft',size:14}),' ',this.t('backToSearch')) : null,
          this.state.resumeTrip && !this.state.navigating ? h('button',{type:'button',className:'status-chip resume-chip',onClick:this.startNavigation},'▶ ',this.t('resume')) : null,
          this.state.spotifyStatus && this.state.spotifyStatus.connected && this.state.spotifyStatus.playback && this.state.spotifyStatus.playback.item ? h('button',{type:'button',className:'status-chip spotify-chip',onClick:function(){self.spotifyControl(self.state.spotifyStatus.playback.is_playing?'pause':'play');}},'♫ ',this.state.spotifyStatus.playback.item.name,' ',this.state.spotifyStatus.playback.is_playing?'Ⅱ':'▶') : null
        )
      ) : null,
      h('div', {className:'map-tools'},
        h(IconButton,{icon:h(AppIcon,{name:'zoomIn'}),title:this.t('zoomIn'),onClick:function(){if(self.map)self.map.setZoom(self.map.zoom+1);}}),
        h(IconButton,{icon:h(AppIcon,{name:'zoomOut'}),title:this.t('zoomOut'),onClick:function(){if(self.map)self.map.setZoom(self.map.zoom-1);}}),
        h(IconButton,{icon:h(AppIcon,{name:'locate'}),title:this.t('follow'),active:this.state.follow,onClick:function(){self.setState({follow:true});if(self.state.position&&self.map)self.map.setView(self.state.position,16);else self.locate(false).catch(function(error){self.showToast(error.message,true);});}}),
        h(IconButton,{icon:h(AppIcon,{name:'reset'}),title:this.t('resetView'),onClick:this.resetMapView}),
        h(IconButton,{icon:h(AppIcon,{name:'rotate'}),title:this.t('rotateScreen'),onClick:this.toggleOrientation}),
        h(IconButton,{icon:h(AppIcon,{name:'layers'}),title:this.t('mapStyle'),onClick:function(){self.setMapStyle(self.state.mapStyle==='road'?'satellite':'road');}})
      ),
      !this.state.navigating ? h('div',{className:'map-side-action'},h(IconButton,{icon:h(AppIcon,{name:'report'}),title:this.t('report'),onClick:function(){self.setState({modal:'report'});}})) : null,
      this.state.activeAlert ? h('div',{className:'safety-alert '+(this.state.activeAlert.over?'danger':'')},h('b',null,this.state.activeAlert.type==='camera'?'📷':this.state.activeAlert.type==='weather'?'❄':this.state.activeAlert.type==='service'?'🅂':'⚠'),h('span',null,h('strong',null,this.state.activeAlert.title),this.state.activeAlert.distance!=null?h('small',null,formatDistance(this.state.activeAlert.distance,this.state.lang,this.state.units)+(this.state.activeAlert.limit?' · '+this.t('speedLimit')+' '+(this.state.units==='mi'?Math.round(this.state.activeAlert.limit/1.609344)+' mph':this.state.activeAlert.limit+' km/h'):'')):null),this.state.activeAlert.over?h('em',null,this.t('overSpeed')):null) : null,
      this.state.navigating ? this.renderNavigationHud() : null,
      route && !this.state.navigating ? h('section',{className:'route-sheet with-nav'},
        h('div',{className:'route-summary'},h('div',null,h('h3',null,this.t('routeReady')),h('p',null,this.state.destination?this.state.destination.label:'')),h('span',{className:'eyebrow'},this.t(this.state.travelMode))),
        this.state.routes.length>1?h('div',{className:'route-options'},this.state.routes.map(function(item,index){return h('button',{type:'button',key:item.id,className:self.state.routeIndex===index?'active':'',onClick:function(){self.selectRoute(index);}},formatDuration(item.duration,self.state.lang));})):null,
        h('div',{className:'route-stats'},h('div',{className:'route-stat'},h('strong',null,formatDistance(route.distance,this.state.lang,this.state.units)),h('span',null,this.t('routeDistance'))),h('div',{className:'route-stat'},h('strong',null,formatDuration(route.duration,this.state.lang)),h('span',null,this.t('routeTime')))),
        h('div',{className:'route-actions'},h('button',{className:'btn primary',type:'button',onClick:this.startNavigation},h(AppIcon,{name:'navigation',size:18}),' ',this.t('startNavigation')),h(IconButton,{icon:h(AppIcon,{name:'save'}),title:this.t('savePlace'),onClick:function(){self.setState({modal:'save'});}}))
      ) : null,
      !route && !this.state.navigating && this.state.routing ? h('section',{className:'route-sheet with-nav'},h('div',{className:'empty-state'},h('div',{className:'spinner'}),this.t('loading'))) : null,
      !this.state.navigating && (this.state.showNearby||this.state.showServices) && this.state.nearby.length ? h('div',{className:'nearby-strip'},this.state.nearby.filter(function(item){return item.type==='fuel'||item.type==='parking'||(item.type==='service'&&self.state.showServices);}).slice(0,4).map(function(item){return h('button',{type:'button',key:item.id,onClick:function(){self.navigateToSelected({id:item.id,title:item.name,label:item.name,lat:item.lat,lon:item.lon,address:item.operator||''});}},h('b',null,item.type==='fuel'?'⛽':(item.type==='service'?'S':'P')),h('span',null,h('strong',null,item.name),h('small',null,formatDistance(item.distance,self.state.lang,self.state.units)+' · '+(item.price||item.fee||self.t('priceUnavailable')))));})) : null,
      this.renderAdvertCard(false)
    );
  };

  GoApp.prototype.renderNavigationHud = function () {
    var self=this, speed = formatSpeed(this.state.position && this.state.position.speed, this.state.units), eta = this.state.remainingDuration != null ? new Date(Date.now()+this.state.remainingDuration*1000) : null, alert=this.state.activeAlert;
    return h('div',{className:'navigation-layer'},
      h('div',{className:'navigation-hud'},
        h('div',{className:'instruction-card'},h('div',{className:'turn-icon'},this.turnIcon()),h('div',null,h('h3',null,this.state.rerouting?this.t('rerouting'):this.currentInstruction()),h('p',null,this.state.wakeLock?this.t('wakeLockOn'):this.t('wakeLockOff'))),h('div',{className:'speed-stack'},alert&&alert.limit?h('div',{className:'speed-limit '+(alert.over?'over':'')},alert.limit):null,h('div',{className:'speed-badge '+(alert&&alert.over?'over':'')},h('strong',null,speed.value),h('small',null,speed.label)))),
        h('div',{className:'live-metrics'},h('div',{className:'live-metric'},h('strong',null,formatDistance(this.state.remainingDistance,this.state.lang,this.state.units)),h('span',null,this.t('remaining'))),h('div',{className:'live-metric'},h('strong',null,eta?formatTime(eta,this.state.lang):'—'),h('span',null,this.t('eta'))),h('div',{className:'live-metric speed-metric '+(this.state.speedOver?'over':'')},h('strong',{className:'speed-readout'},h('b',null,speed.value),h('small',null,speed.label)),h('span',null,this.t('speed'))))
      ),
      h('div',{className:'exit-navigation','aria-label':this.t('exitNavigation')},
        h('button',{type:'button',className:'btn secondary small',onClick:function(){self.exitNavigationTo('search');}},h(AppIcon,{name:'search',size:16}),h('span',null,this.t('exitSearch'))),
        h('button',{type:'button',className:'btn secondary small',onClick:function(){self.exitNavigationTo('home');}},h(AppIcon,{name:'arrowLeft',size:16}),h('span',null,this.t('exitHome'))),
        h('button',{type:'button',className:'btn danger small',onClick:this.stopNavigation},h(AppIcon,{name:'stop',size:15}),h('span',null,this.t('stopNavigation')))
      )
    );
  };

  GoApp.prototype.renderSearchView = function () {
    var self = this;
    var results = normalisePlaceResults(this.state.searchResults);
    function resultCard(place, index) {
      var meta = [place.type, place.country].filter(Boolean).join(' · ');
      var locality = [place.city, place.postcode].filter(Boolean).join(' · ');
      return h('article',{className:'panel place-result',key:place.id || ('result-'+index)},
        h('button',{type:'button',className:'place-result-main',onClick:function(){self.openPlace(place);}},
          h('div',{className:'place-result-title'},
            h('span',{className:'place-kind','aria-hidden':'true'},h(AppIcon,{name:'pin',size:18})),
            h('div',null,h('h3',null,place.title),meta?h('p',null,meta):null)
          ),
          h('div',{className:'place-result-address'},
            h('strong',null,place.address || place.label),
            locality?h('span',null,locality):null
          )
        ),
        h('button',{type:'button',className:'btn primary small place-navigate-button',onClick:function(){self.navigateToSelected(place);}},self.t('navigate'))
      );
    }
    var content;
    if (this.state.searchLoading) {
      content = h('div',{className:'panel empty-state search-status','aria-live':'polite'},h('div',{className:'spinner'}),this.t('searching'));
    } else if (results.length) {
      content = h('div',{className:'place-results','aria-live':'polite'},results.map(resultCard));
    } else if (this.state.searchHasRun) {
      content = h('div',{className:'panel empty-state search-status','aria-live':'polite'},
        h('div',{className:'empty-icon','aria-hidden':'true'},'⌕'),
        h('strong',null,this.state.searchError || this.t('noResults')),
        h('button',{type:'button',className:'btn secondary small',onClick:function(){self.handlePlaceSearch();}},this.t('retry'))
      );
    } else {
      content = h('div',{className:'panel empty-state search-status'},h('div',{className:'empty-icon','aria-hidden':'true'},'⌕'),this.t('chooseResult'));
    }
    return h('section',{className:'app-view page-view search-view'},
      h('header',{className:'page-header'},
        h('div',null,h('span',{className:'eyebrow'},'go-app places'),h('h1',null,this.t('placeSearchTitle')),h('p',null,this.t('searchAllEurope'))),
        h('button',{type:'button',className:'btn ghost small back-map-button',onClick:function(){self.setView('map');}},h(AppIcon,{name:'arrowLeft',size:16}),' ',this.t('backToMap'))
      ),
      h('div',{className:'place-country-filter'},h('span',null,this.t('selectCountry')),this.renderCountrySelect()),
      h('form',{className:'place-search-form',onSubmit:this.handlePlaceSearch,action:'#',noValidate:true},
        h('div',{className:'search-box large'},
          h(AppIcon,{name:'search',size:21}),
          h('input',{value:this.state.searchQuery,onChange:function(e){self.setState({searchQuery:e.target.value,searchError:''});},placeholder:this.t('placeSearchTitle'),type:'search',inputMode:'search',enterKeyHint:'search',autoComplete:'off','aria-label':this.t('placeSearchTitle')}),
          this.state.searchQuery?h('button',{type:'button',className:'search-clear','aria-label':this.t('close'),onClick:function(){self.placeSearchSequence++;self.setState({searchQuery:'',searchResults:[],searchError:'',searchHasRun:false,searchLoading:false});}},'×'):null,
          h('button',{type:'submit',className:'btn primary small search-submit-icon',disabled:this.state.searchLoading,'aria-label':this.t('search'),title:this.t('search')},this.state.searchLoading?h('span',{className:'mini-spinner','aria-hidden':'true'}):h(AppIcon,{name:'search',size:20}))
        )
      ),
      this.state.searchError && results.length ? h('div',{className:'panel search-warning','aria-live':'polite'},this.state.searchError):null,
      content
    );
  };

  GoApp.prototype.renderRadioView = function () {
    var self=this,needle=this.state.radioSearch.trim().toLowerCase(),stations=this.state.radioStations.filter(function(station){return !needle||(station.name+' '+(station.tags||'')).toLowerCase().indexOf(needle)>=0;});
    var sourceLabel=this.state.radioSource==='live'?this.t('stationsLive'):(this.state.radioSource==='built-in'?this.t('stationsFallback'):this.t('stationsCache'));
    return h('section',{className:'app-view page-view'},h('header',{className:'page-header'},h('div',null,h('span',{className:'eyebrow'},'go-app audio'),h('h1',null,this.t('radioTitle')),h('p',null,this.t('radioSubtitle')))),h('div',{className:'media-tabs'},['radio','files','spotify'].map(function(tab){return h('button',{type:'button',key:tab,className:self.state.mediaTab===tab?'active':'',onClick:function(){self.setState({mediaTab:tab},function(){if(tab==='spotify')self.loadSpotifyStatus();});}},h(AppIcon,{name:tab==='radio'?'radio':tab==='files'?'music':'music',size:18}),self.t(tab==='radio'?'mediaRadio':tab==='files'?'mediaFiles':'mediaSpotify'));})),
      this.state.mediaTab==='radio'?h('div',null,this.renderRadioCountryTabs(),h('div',{className:'search-box'},h(AppIcon,{name:'search',size:18}),h('input',{value:this.state.radioSearch,onChange:function(e){self.setState({radioSearch:e.target.value});},placeholder:this.t('searchStations')})),h('p',{className:'radio-cache-note'},'● ',sourceLabel,' · ',stations.length,' ',this.t('stationCount')),h('div',{className:'station-list'},this.state.radioLoading?h('div',{className:'empty-state'},h('div',{className:'spinner'}),this.t('loading')):stations.map(function(station){var current=self.state.player.station&&self.state.player.station.id===station.id;return h('button',{type:'button',className:'station-card'+(current&&self.isPlayerActive()?' playing':''),key:station.id,'aria-pressed':!!(current&&self.isPlayerActive()),onClick:function(){self.playStation(station);}},h(StationLogo,{station:station}),h('span',null,h('h3',null,station.name),h('p',null,[station.codec,station.bitrate?station.bitrate+' kbps':'',station.tags].filter(Boolean).join(' · '))),h('span',{className:'play-circle'},h(AppIcon,{name:current&&self.isPlayerActive()?'pause':'play',size:20})));}))) : null,
      this.state.mediaTab==='files'?h('section',{className:'panel local-audio-panel'},h('div',{className:'media-hero-icon'},h(AppIcon,{name:'music',size:34})),h('h2',null,this.t('localAudio')),h('p',null,this.t('localFilesNote')),h('label',{className:'btn primary file-picker'},this.t('selectAudio'),h('input',{type:'file',accept:'audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac',multiple:true,onChange:this.handleLocalFiles})),h('div',{className:'local-track-list'},this.state.localTracks.map(function(track,index){return h('button',{type:'button',key:track.id,className:self.state.localTrackIndex===index?'active':'',onClick:function(){self.playLocalTrack(index);}},h(AppIcon,{name:'music',size:17}),h('span',null,track.name),h('b',null,self.state.localTrackIndex===index&&self.state.player.playing?'Ⅱ':'▶'));}))) : null,
      this.state.mediaTab==='spotify'?this.renderSpotifyPanel():null
    );
  };

  GoApp.prototype.renderSpotifyPanel = function () {
    var self=this,user=this.state.user,status=this.state.spotifyStatus,playback=status&&status.playback,item=playback&&playback.item;
    if (!user) return h('section',{className:'panel spotify-panel'},h('h2',null,'Spotify'),h('p',null,this.t('signIn')+' · '+this.t('proOnly')),h('button',{className:'btn primary',type:'button',onClick:function(){self.setState({modal:'auth',authMode:'login'});}},this.t('signIn')));
    if (user.plan!=='pro') return h('section',{className:'panel spotify-panel'},h('h2',null,'Spotify'),h('p',null,this.t('proOnly')+'. '+this.t('requestPro')));
    if (!status||!status.connected) return h('section',{className:'panel spotify-panel'},h('div',{className:'spotify-logo'},'♫'),h('h2',null,this.t('connectSpotify')),h('p',null,'Control playback without leaving navigation.'),h('button',{className:'btn spotify',type:'button',onClick:this.startSpotifyConnect},this.t('connectSpotify')));
    return h('section',{className:'panel spotify-panel'},h('span',{className:'eyebrow'},'Spotify Premium'),item?h('div',{className:'spotify-now'},item.album&&item.album.images&&item.album.images[0]?h('img',{src:item.album.images[0].url,alt:''}):null,h('div',null,h('h2',null,item.name),h('p',null,(item.artists||[]).map(function(a){return a.name;}).join(', ')))):h('p',null,'Open Spotify on an active device.'),h('div',{className:'spotify-controls'},h('button',{type:'button',onClick:function(){self.spotifyControl('previous');}},'‹‹'),h('button',{type:'button',className:'primary',onClick:function(){self.spotifyControl(playback&&playback.is_playing?'pause':'play');}},playback&&playback.is_playing?'Ⅱ':'▶'),h('button',{type:'button',onClick:function(){self.spotifyControl('next');}},'››')),h('button',{type:'button',className:'btn ghost small',onClick:this.disconnectSpotify},this.t('disconnectSpotify')));
  };

  GoApp.prototype.renderProfileView = function () {
    var self=this,user=this.state.user;
    return h('section',{className:'app-view page-view'},h('header',{className:'page-header'},h('div',null,h('span',{className:'eyebrow'},'go-app'),h('h1',null,this.t('profileTitle')),h('p',null,this.state.online?this.t('online'):this.t('offline')))),h('section',{className:'panel profile-hero'},h('div',{className:'avatar'},initials(user?user.fullName:'Guest')),h('div',null,h('h2',null,user?user.fullName:this.t('guestUser')),h('p',null,user?(user.email+' · '+String(user.plan||'free').toUpperCase()):this.t('guestHint')))),!this.state.installed?h('section',{className:'panel install-card'},h('h3',null,this.t('installApp')),h('p',null,this.t('installDescription')),h(InstallPlatforms,{onInstall:this.installApp,t:this.t.bind(this)})):null,
      h('div',{className:'section-title'},h('div',null,h('h2',null,this.t('languageSetting')))),h(LanguageSwitch,{value:this.state.lang,onChange:this.setLanguage,t:this.t.bind(this)}),
      h('div',{className:'settings-grid'},h('section',{className:'panel setting-card'},h('h3',null,this.t('unitsSetting')),h('div',{className:'segmented-setting'},['km','mi'].map(function(unit){return h('button',{type:'button',key:unit,className:self.state.units===unit?'active':'',onClick:function(){self.setUnits(unit);}},h('strong',null,unit==='km'?self.t('kilometres'):self.t('miles')),h('small',null,unit==='km'?self.t('unitKm'):self.t('unitMiles')));}))),h('section',{className:'panel setting-card'},h('h3',null,this.t('travelMode')),this.renderModeSelector()),h('section',{className:'panel setting-card'},h('h3',null,this.t('mapStyle')),h('div',{className:'segmented-setting map-style-setting'},['road','satellite'].map(function(style){return h('button',{type:'button',key:style,className:self.state.mapStyle===style?'active':'',onClick:function(){self.setMapStyle(style);}},style==='road'?self.t('roadMap'):self.t('satellite'));}))),h('section',{className:'panel setting-card'},h('h3',null,this.t('appearance')),h('p',{className:'setting-description'},this.t('themeDescription')),h('div',{className:'segmented-setting theme-setting'},['day','night'].map(function(theme){return h('button',{type:'button',key:theme,className:self.state.theme===theme?'active':'',onClick:function(){self.setTheme(theme);}},h(AppIcon,{name:theme==='day'?'sun':'moon',size:18}),h('strong',null,theme==='day'?self.t('dayMode'):self.t('nightMode')));}))),h('section',{className:'panel setting-card orientation-card'},h('h3',null,this.t('allowRotation')),h('p',{className:'setting-description'},this.t('rotationReady')),h('button',{type:'button',className:'btn secondary wide',onClick:this.toggleOrientation},h(AppIcon,{name:'rotate',size:18}),this.t('rotateScreen'))),h('section',{className:'panel setting-card switch-card'},h('div',null,h('h3',null,this.t('showNearby')),h('p',null,this.t('nearby'))),h('button',{type:'button',className:'switch '+(this.state.showNearby?'on':''),onClick:function(){var next=!self.state.showNearby;localStorage.setItem('go-app-show-nearby',next?'true':'false');self.setState({showNearby:next,nearby:next?self.state.nearby:[]},function(){if(next&&self.state.position)self.loadEnvironment(self.state.position,true);});}},h('span'))),h('section',{className:'panel setting-card switch-card'},h('div',null,h('h3',null,this.t('serviceAreas')),h('p',null,this.t('showServiceAreas'))),h('button',{type:'button',className:'switch '+(this.state.showServices?'on':''),onClick:function(){var next=!self.state.showServices;localStorage.setItem('go-app-show-services',next?'true':'false');self.setState({showServices:next,nearby:next?self.state.nearby:self.state.nearby.filter(function(item){return item.type!=='service';})},function(){if(next&&(self.state.position||self.state.origin))self.loadEnvironment(self.state.position||self.state.origin,true);});}},h('span')))),
      h('div',{className:'section-title'},h('div',null,h('h2',null,this.t('support')))),h('section',{className:'panel support-card'},h('div',{className:'setting-icon'},'✉'),h('div',null,h('h3',null,this.t('contactUs')),h('p',null,this.t('supportIntro'))),h('div',{className:'support-actions'},h('button',{type:'button',className:'btn primary small',onClick:function(){self.setState({modal:'feedback'});}},this.t('sendMessage')),this.state.app.newsletter&&this.state.app.newsletter.enabled?h('button',{type:'button',className:'btn secondary small',onClick:function(){self.setState({modal:'newsletter'});}},this.t('subscribe')):null)),
      h('div',{className:'section-title'},h('div',null,h('h2',null,this.t('savedPlaces')))),h('div',{className:'card-list'},this.state.savedPlaces.length?this.state.savedPlaces.map(function(place){return h('article',{className:'panel saved-place',key:place.id},h('div',{className:'setting-icon'},'⌖'),h('button',{type:'button',className:'saved-place-main',onClick:function(){self.useSavedPlace(place);}},h('h3',null,place.name),h('p',null,place.label)),h(IconButton,{small:true,icon:'×',title:self.t('delete'),onClick:function(){self.deletePlace(place);}}));}):h('div',{className:'panel empty-state'},this.t('noSavedPlaces'))),
      h('section',{className:'panel settings-list'},h('button',{type:'button',className:'setting-row',onClick:function(){self.toggleKeepAwake();}},h('div',{className:'setting-icon'},'☀'),h('div',{className:'setting-copy'},h('strong',null,this.t('keepAwakeSetting')),h('span',null,this.t('keepAwakeDescription'))),h('span',{className:'setting-value'},this.state.keepAwake?this.t('enabled'):this.t('disabled'))),h('a',{className:'setting-row admin-login-row',href:'?=admin'},h('div',{className:'setting-icon'},h(AppIcon,{name:'admin',size:19})),h('div',{className:'setting-copy'},h('strong',null,this.t('adminLogin')),h('span',null,this.t('adminLoginDescription'))),h('span',{className:'setting-value'},'›')),user?h('button',{type:'button',className:'setting-row',onClick:function(){self.logout();}},h('div',{className:'setting-icon'},'↪'),h('div',{className:'setting-copy'},h('strong',null,this.t('signOut')),h('span',null,user.email)),h('span',{className:'setting-value'},'›')):h('button',{type:'button',className:'setting-row',onClick:function(){self.setState({modal:'auth',authMode:'login'});}},h('div',{className:'setting-icon'},'♙'),h('div',{className:'setting-copy'},h('strong',null,this.t('signIn')),h('span',null,this.t('createAccount'))),h('span',{className:'setting-value'},'›')))
    );
  };

  GoApp.prototype.renderPlayer = function () {
    var station=this.state.player.station,self=this;if(!station)return null;
    return h('section',{className:'player-bar'},h(StationLogo,{station:station}),h('div',{className:'player-info'},h('strong',null,station.name),h('span',null,this.playerStatusLabel()+(this.state.player.detail?' · '+this.state.player.detail:''))),h('div',{className:'player-actions'},h('button',{type:'button',className:'icon-btn small active',onClick:this.togglePlayer,'aria-label':this.state.player.playing?this.t('paused'):this.t('playing')},h(AppIcon,{name:this.isPlayerActive()?'pause':'play',size:18})),h('button',{type:'button',className:'icon-btn small',onClick:this.stopPlayer,'aria-label':this.t('stopAudio')},h(AppIcon,{name:'stop',size:18}))));
  };

  GoApp.prototype.renderBottomNav = function () {
    var self=this,items=[{view:'map',icon:'map',label:'navMap'},{view:'search',icon:'search',label:'navSearch'},{view:'radio',icon:'radio',label:'navRadio'},{view:'reports',icon:'report',label:'navReports'},{view:'profile',icon:'profile',label:'navProfile'}];
    return h('nav',{className:'bottom-nav','aria-label':'go-app'},items.map(function(item){return h('button',{type:'button',key:item.view,className:self.state.view===item.view?'active':'',onClick:function(){self.setView(item.view);}},item.view==='radio'&&self.isPlayerActive()?h('i',{className:'playing-dot'}):null,h('span',{className:'nav-icon'},h(AppIcon,{name:item.icon,size:21})),h('span',null,self.t(item.label)));}));
  };

  GoApp.prototype.submitNewsletter = function (event) {
    event.preventDefault(); var self=this, formNode=event.currentTarget, form=new FormData(formNode);
    var body={email:String(form.get('email')||''),language:this.state.lang,consent:!!formNode.querySelector('[name="consent"]:checked'),captchaToken:this.captchaToken(formNode)};
    this.setLoading(true); this.api('newsletter_subscribe',{method:'POST',body:body}).then(function(){self.setState({loading:false,modal:null});self.showToast(self.t('newsletterSaved'));}).catch(function(error){self.setLoading(false);self.showToast(error.message,true);});
  };

  GoApp.prototype.renderNewsletterModal = function () {
    return h(Modal,{title:this.t('newsletterTitle'),closeLabel:this.t('close'),onClose:this.dismissModal},h('form',{className:'form-grid newsletter-form',onSubmit:this.submitNewsletter},h('p',{className:'modal-note'},this.t('newsletterText')),h('label',{className:'field'},h('span',null,this.t('email')),h('input',{name:'email',type:'email',required:true,autoComplete:'email',placeholder:'you@example.com'})),h('label',{className:'check-row'},h('input',{type:'checkbox',name:'consent',required:true}),h('span',null,h('strong',null,this.t('newsletterConsent')),h('small',null,this.t('newsletterPrivacy')))),this.state.captcha&&this.state.captcha.enabled?h('div',{className:'go-hcaptcha','data-rendered':'0'}):null,h('div',{className:'form-actions'},h('button',{type:'button',className:'btn ghost',onClick:this.dismissModal},this.t('cancel')),h('button',{type:'submit',className:'btn primary'},this.t('subscribe')))));
  };

  GoApp.prototype.renderAuthModal = function () {
    var self=this,register=this.state.authMode==='register';
    return h(Modal,{title:register?this.t('registerTitle'):this.t('loginTitle'),closeLabel:this.t('close'),onClose:this.dismissModal},h('div',{className:'radio-country-tabs'},h('button',{type:'button',className:!register?'active':'',onClick:function(){self.setState({authMode:'login'});}},this.t('signIn')),h('button',{type:'button',className:register?'active':'',onClick:function(){self.setState({authMode:'register'});}},this.t('createAccount'))),h('form',{className:'form-grid',onSubmit:this.submitAuth},register?h('label',{className:'field'},h('span',null,this.t('fullName')),h('input',{name:'fullName',required:true,minLength:2,maxLength:120,autoComplete:'name'})):null,h('label',{className:'field'},h('span',null,register?this.t('email'):this.t('email')+' / username'),h('input',{name:'email',type:register?'email':'text',required:true,maxLength:190,autoComplete:'email'})),h('label',{className:'field'},h('span',null,this.t('password')),h('input',{name:'password',type:'password',required:true,minLength:8,autoComplete:register?'new-password':'current-password'})),register&&this.state.app.allowProRequests?h('label',{className:'check-row'},h('input',{type:'checkbox',name:'requestPro'}),h('span',null,h('strong',null,this.t('requestPro')),h('small',null,this.t('proOnly')))):null,this.state.captcha&&this.state.captcha.enabled?h('div',{className:'go-hcaptcha','data-rendered':'0'}):null,register?h('p',{className:'modal-note'},this.t('pendingApproval')):null,h('div',{className:'form-actions'},h('button',{type:'button',className:'btn ghost',onClick:this.dismissModal},this.t('cancel')),h('button',{type:'submit',className:'btn primary'},register?this.t('submitRegister'):this.t('submitLogin')))));
  };

  GoApp.prototype.renderFeedbackModal = function () {
    var user=this.state.user;
    return h(Modal,{title:this.t('contactUs'),closeLabel:this.t('close'),onClose:this.dismissModal},h('form',{className:'form-grid',onSubmit:this.submitFeedback},h('p',{className:'modal-note'},this.t('supportIntro'),this.state.app.supportEmail?h('span',{className:'support-email'},h('a',{href:'mailto:'+this.state.app.supportEmail},this.state.app.supportEmail)):null),h('label',{className:'field'},h('span',null,this.t('fullName')),h('input',{name:'name',required:true,defaultValue:user?user.fullName:''})),h('label',{className:'field'},h('span',null,this.t('email')),h('input',{name:'email',type:'email',required:true,defaultValue:user?user.email:''})),h('label',{className:'field'},h('span',null,this.t('feedbackCategory')),h('select',{name:'category'},h('option',{value:'feedback'},this.t('feedback')),h('option',{value:'support'},this.t('support')),h('option',{value:'bug'},'Bug'),h('option',{value:'partnership'},'Partnership'))),h('label',{className:'field'},h('span',null,this.t('message')),h('textarea',{name:'message',rows:6,minLength:5,maxLength:3000,required:true})),this.state.captcha&&this.state.captcha.enabled?h('div',{className:'go-hcaptcha','data-rendered':'0'}):null,h('div',{className:'form-actions'},h('button',{type:'button',className:'btn ghost',onClick:this.dismissModal},this.t('cancel')),h('button',{type:'submit',className:'btn primary'},this.t('sendMessage')))));
  };

  GoApp.prototype.renderPlaceModal = function () {
    var self=this,p=this.state.selectedPlace;if(!p)return null;
    function row(label,value,link){if(!value)return null;return h('div',{className:'detail-row'},h('span',null,label),link?h('a',{href:link,target:'_blank',rel:'noopener'},value):h('strong',null,value));}
    return h(Modal,{title:p.title||this.t('placeDetails'),closeLabel:this.t('close'),onClose:this.dismissModal},h('div',{className:'place-detail-card'},h('p',{className:'place-full-label'},p.label||p.address),row(this.t('address'),p.address),row(this.t('townCity'),p.city),row(this.t('postcode'),p.postcode),row(this.t('openingHours'),p.openingHours),row(this.t('phone'),p.phone,p.phone?'tel:'+p.phone:null),row(this.t('website'),p.website,p.website),h('button',{type:'button',className:'btn primary wide',onClick:function(){self.navigateToSelected(p);}},h(AppIcon,{name:'navigation',size:18}),' ',this.t('navigate'))));
  };

  GoApp.prototype.renderModal = function () {
    if(this.state.modal==='auth')return this.renderAuthModal();
    if(this.state.modal==='report')return this.renderReportModal();
    if(this.state.modal==='save')return this.renderSaveModal();
    if(this.state.modal==='install')return this.renderInstallModal();
    if(this.state.modal==='feedback')return this.renderFeedbackModal();
    if(this.state.modal==='newsletter')return this.renderNewsletterModal();
    if(this.state.modal==='place')return this.renderPlaceModal();
    return null;
  };

  GoApp.prototype.renderApp = function () {
    var view;if(this.state.view==='search')view=this.renderSearchView();else if(this.state.view==='radio')view=this.renderRadioView();else if(this.state.view==='reports')view=this.renderReportsView();else if(this.state.view==='profile')view=this.renderProfileView();else view=this.renderMapView();
    var showPlayer=this.state.player.station&&(this.state.view!=='map'||(!this.state.navigating&&!this.state.routes.length));
    return h('main',{className:'app-shell'+(this.state.navigating?' navigating-shell':'')},h('div',{className:'app-content'},view),showPlayer?this.renderPlayer():null,!this.state.navigating?this.renderBottomNav():null,this.renderModal(),this.state.toast?h('div',{className:'toast show'+(this.state.toastError?' error':'')},this.state.toast):null,this.state.loading?h('div',{className:'global-loader'},h('div',{className:'spinner'})):null);
  };


  GoApp.prototype.renderCountrySelect = function (compact) {
    var self=this, used={};
    function option(code){used[code]=true;return h('option',{key:code,value:code},compact?code:(countryFlag(code)+' '+countryName(code,self.state.lang)));}
    function group(label,codes){return h('optgroup',{key:label,label:label},codes.filter(function(code){return !used[code];}).map(option));}
    var euOther=EU_COUNTRIES.filter(function(code){return BALTIC_COUNTRIES.indexOf(code)<0&&NORDIC_COUNTRIES.indexOf(code)<0;});
    var otherEurope=EUROPE_COUNTRIES.filter(function(code){return EU_COUNTRIES.indexOf(code)<0&&NORDIC_COUNTRIES.indexOf(code)<0;});
    return h('label',{className:'country-select'+(compact?' compact-country':''),title:this.t('selectCountry')},h('span',{'aria-hidden':'true'},compact?this.state.navCountry:countryFlag(this.state.navCountry)),h('select',{value:this.state.navCountry,'aria-label':this.t('selectCountry'),onChange:function(event){var code=event.target.value;localStorage.setItem('go-app-nav-country',code);self.placeSearchSequence++;self.setState({navCountry:code,suggestions:[],searchResults:[],searchError:'',searchHasRun:false,searchLoading:false},function(){if(!self.state.position&&!self.state.origin&&self.map){var c=COUNTRY_CENTERS[code]||COUNTRY_CENTERS.ALL;self.map.setView(c,c.zoom);}});}},group(this.t('quickRegions'),NAV_REGIONS),group(this.t('balticStates'),BALTIC_COUNTRIES),group(this.t('nordicCountries'),NORDIC_COUNTRIES),group(this.t('euCountries'),euOther),group(this.t('otherEurope'),otherEurope)));
  };

  GoApp.prototype.renderRadioCountryTabs = function () {
    var self=this;
    return h('div',{className:'radio-country-tabs'},RADIO_COUNTRIES.map(function(code){return h('button',{type:'button',key:code,className:self.state.radioCountry===code?'active':'',onClick:function(){self.loadRadioStations(code);}},countryFlag(code),' ',code==='LV'?self.t('latvia'):code==='GB'?self.t('unitedKingdom'):self.t('ukraine'));}));
  };

  GoApp.prototype.renderAdvertCard = function (inline) {
    var self=this, advertising=this.state.app&&this.state.app.advertising, user=this.state.user;
    if(!advertising||!advertising.enabled||this.state.adDismissed||(user&&user.plan==='pro'))return null;
    if(!inline&&(this.state.navigating||this.state.routes.length||this.state.view!=='map'))return null;
    var slides=Array.isArray(advertising.slides)?advertising.slides.filter(function(slide){return slide&&slide.enabled!==false&&slide.title;}):[];
    if(!slides.length)return null;
    var index=((this.state.adIndex%slides.length)+slides.length)%slides.length, ad=slides[index];
    var hasNearby=!inline&&(this.state.nearby||[]).some(function(item){return item.type==='service'?self.state.showServices:self.state.showNearby;});
    function go(delta){self.setState({adIndex:(index+delta+slides.length)%slides.length});self.scheduleAdvertRotation();}
    return h('aside',{className:'home-ad ad-carousel'+(inline?' inline':' floating')+(hasNearby?' with-nearby':''),'aria-label':ad.label||this.t('homePromotion')},
      ad.imageUrl?h('img',{src:ad.imageUrl,alt:'',loading:'lazy'}):h('div',{className:'home-ad-icon'},'✦'),
      h('div',{className:'home-ad-copy',key:'ad-'+index},h('span',null,ad.label||this.t('homePromotion')),h('strong',null,ad.title),ad.text?h('p',null,ad.text):null,
        slides.length>1?h('div',{className:'home-ad-dots','aria-label':'Promotion slides'},slides.map(function(_,dot){return h('button',{type:'button',key:dot,className:dot===index?'active':'','aria-label':'Slide '+(dot+1),onClick:function(){self.setState({adIndex:dot});self.scheduleAdvertRotation();}});})):null),
      ad.url?h('a',{className:'btn primary small',href:ad.url,target:'_blank',rel:'noopener sponsored'},ad.buttonLabel||this.t('learnMore')):null,
      slides.length>1?h('div',{className:'home-ad-arrows'},h('button',{type:'button','aria-label':'Previous promotion',onClick:function(){go(-1);}},'‹'),h('button',{type:'button','aria-label':'Next promotion',onClick:function(){go(1);}},'›')):null,
      h('button',{type:'button',className:'home-ad-close','aria-label':this.t('closeAd'),onClick:function(){sessionStorage.setItem('go-app-ad-dismissed','1');self.setState({adDismissed:true});}},'×'));
  };

  GoApp.prototype.searchPlaces = function (query) {
    var self=this, params={q:query,lang:this.state.lang};
    params.country=this.state.navCountry.toLowerCase();
    this.setState({searching:true});
    this.api('geocode',{params:params}).then(function(data){self.setState({suggestions:data.results||[],searching:false});}).catch(function(error){self.setState({searching:false,suggestions:[]});self.showToast(error.message,true);});
  };

  GoApp.prototype.initMapSoon = function () {
    var self=this;
    setTimeout(function(){
      if(!self.mapNode||(self.map&&self.map.container===self.mapNode))return;
      if(self.map)self.map.destroy();self.mapNode.replaceChildren();
      self.map=new TileMap(self.mapNode,{tileUrl:self.state.maps.tileUrl,onClick:function(){},onUserMove:function(){if(self.map)self.map.setBearing(0);if(self.state.follow)self.setState({follow:false});}});
      var c=COUNTRY_CENTERS[self.state.navCountry]||COUNTRY_CENTERS.ALL,initial=self.state.position||self.state.origin||c;
      self.map.setView(initial,self.state.position?15:(c.zoom||7));self.map.setMode(self.state.travelMode);
      self.map.setPoi(visiblePoiItems(self.state));self.map.setTileStyle(self.state.mapStyle,self.state.maps.tileUrl);self.map.setReports(self.state.reports);self.map.setUser(self.state.position);self.map.setDestination(self.state.destination);
      var route=self.state.routes[self.state.routeIndex];if(route){self.map.setRoute(route,self.state.routes.filter(function(_,index){return index!==self.state.routeIndex;}));self.map.fitCoordinates(route.coordinates);}
    },0);
  };

  GoApp.prototype.resetMapView = function () {
    if(!this.map)return;var route=this.state.routes[this.state.routeIndex];
    if(route&&route.coordinates&&route.coordinates.length){this.map.fitCoordinates(route.coordinates);this.setState({follow:false});return;}
    var point=this.state.position||this.state.origin;if(point){this.map.setView(point,this.state.navigating?16:15);this.setState({follow:!!this.state.navigating});return;}
    var c=COUNTRY_CENTERS[this.state.navCountry]||COUNTRY_CENTERS.ALL;this.map.setView(c,c.zoom||7);this.setState({follow:false});
  };

  GoApp.prototype.loadEnvironment = function (point, force) {
    if(!point)return;var now=Date.now();if(!force&&now-this.lastEnvironmentLoad<45000)return;this.lastEnvironmentLoad=now;var self=this,jobs=[];
    if(this.state.features.weather!==false)jobs.push(this.api('weather',{params:{lat:point.lat,lon:point.lon}}).then(function(data){self.setState({weather:data.weather||null},function(){self.updateSafetyAlert();});}).catch(function(){}));
    var kinds=[];if(this.state.features.speedCameras!==false)kinds.push('camera');if(this.state.showNearby){if(this.state.features.fuel!==false)kinds.push('fuel');if(this.state.features.parking!==false)kinds.push('parking');}if(this.state.showServices&&this.state.features.serviceAreas!==false)kinds.push('service');
    if(kinds.length)jobs.push(this.api('nearby',{params:{lat:point.lat,lon:point.lon,radius:this.state.navigating?20000:9000,kinds:kinds.join(',')}}).then(function(data){self.setState({nearby:data.items||[]},function(){self.updateSafetyAlert();});}).catch(function(){}));
    return Promise.all(jobs);
  };

  GoApp.prototype.updateSafetyAlert = function () {
    var point=this.state.position||this.state.origin;if(!point){this.setState({activeAlert:null});return;}
    var route=this.state.routes[this.state.routeIndex],userOnRoute=route&&route.coordinates?nearestOnRoute(point,route.coordinates):null;
    function ahead(item){var direct=haversine(point,item);if(!route||!route.coordinates||!userOnRoute)return direct;var hit=nearestOnRoute({lat:Number(item.lat),lon:Number(item.lon)},route.coordinates);if(!hit||hit.distance>350)return Infinity;var delta=hit.along-userOnRoute.along;return delta>=-100?Math.max(0,delta):Infinity;}
    var candidates=(this.state.nearby||[]).map(function(item){return Object.assign({},item,{actualDistance:ahead(item)});}).filter(function(item){return isFinite(item.actualDistance);}).sort(function(a,b){return a.actualDistance-b.actualDistance;});
    var camera=candidates.filter(function(item){return item.type==='camera';})[0],service=this.state.showServices?candidates.filter(function(item){return item.type==='service';})[0]:null;
    var traffic=(this.state.reports||[]).filter(function(item){return ['traffic','closure','roadwork','hazard','camera'].indexOf(item.type)>=0&&isFinite(Number(item.lat))&&isFinite(Number(item.lon));}).map(function(item){return Object.assign({},item,{actualDistance:ahead({lat:Number(item.lat),lon:Number(item.lon)})});}).filter(function(item){return isFinite(item.actualDistance);}).sort(function(a,b){return a.actualDistance-b.actualDistance;})[0];
    var speed=formatSpeed(point.speed,this.state.units),alert=null;
    if(camera&&camera.actualDistance<=2500){var limit=Number(camera.maxspeed||0)||null,actualKmh=isFinite(point.speed)?point.speed*3.6:0;alert={type:'camera',title:this.t('cameraAhead'),distance:camera.actualDistance,limit:limit,over:!!(limit&&actualKmh>limit+2)};}
    else if(traffic&&traffic.actualDistance<=2200&&this.state.features.communityTraffic!==false)alert={type:'traffic',title:this.t('trafficAhead'),distance:traffic.actualDistance,over:false};
    else if(this.state.weather&&Array.isArray(this.state.weather.alerts)&&this.state.weather.alerts.length){var w=this.state.weather.alerts[0];alert={type:'weather',title:w.type==='ice'?this.t('iceWarning'):w.type==='snow'?this.t('snowWarning'):this.t('windWarning'),distance:null,over:w.level==='danger'};}
    else if(service&&service.actualDistance<=12000)alert={type:'service',title:this.t('serviceSoon')+(service.name?' · '+service.name:''),distance:service.actualDistance,over:false};
    this.setState({activeAlert:alert});
  };


  /* go-app 2.6.7 mobile intro, compact navigation controls and reliable rotation */
  var go265DidMount = GoApp.prototype.componentDidMount;
  GoApp.prototype.componentDidMount = function () {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    this.lowPowerMode = !!((connection && connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
    document.documentElement.classList.toggle('low-performance', this.lowPowerMode);
    document.documentElement.classList.toggle('battery-saver', this.lowPowerMode);
    return go265DidMount.call(this);
  };

  var go265DidUpdate = GoApp.prototype.componentDidUpdate;
  GoApp.prototype.componentDidUpdate = function (prevProps, prevState) {
    go265DidUpdate.call(this, prevProps, prevState);
    if (this.state.view === 'map' && this.map && this.map.container && this.map.container.isConnected) this.map.setPoi(visiblePoiItems(this.state));
  };

  var go265SetView = GoApp.prototype.setView;
  GoApp.prototype.setView = function (view) {
    go265SetView.call(this, view);
    if (view === 'parking') this.loadParkingPlaces(false);
  };

  var go265BuildRoute = GoApp.prototype.buildRoute;
  GoApp.prototype.buildRoute = function (origin, destination, reroute) {
    this.arrivalNotified = false;
    this.loadEnvironment(origin, true);
    return go265BuildRoute.call(this, origin, destination, reroute);
  };

  var go265StartNavigation = GoApp.prototype.startNavigation;
  GoApp.prototype.startNavigation = function () {
    this.arrivalNotified = false;
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(function () {}); } catch (_) {}
    }
    return go265StartNavigation.call(this);
  };

  GoApp.prototype.notifyArrival = function () {
    if (this.arrivalNotified) return;
    this.arrivalNotified = true;
    var title = this.t('arrivalTitle'), destination = this.state.destination && (this.state.destination.title || this.state.destination.label), body = destination ? this.t('arrivalBody') + ' ' + destination : this.t('arrivalBody');
    this.showToast(title);
    if (navigator.vibrate) { try { navigator.vibrate([180,90,180]); } catch (_) {} }
    if ('Notification' in window && Notification.permission === 'granted') {
      var options = {body:body, icon:'assets/icons/icon-192.png', badge:'assets/icons/icon-192.png', tag:'go-app-arrival', renotify:false};
      if (this.state.serviceWorkerReady && 'serviceWorker' in navigator) navigator.serviceWorker.ready.then(function(registration){return registration.showNotification(title, options);}).catch(function(){ try { new Notification(title, options); } catch (_) {} });
      else { try { new Notification(title, options); } catch (_) {} }
    }
  };

  var go265HandlePosition = GoApp.prototype.handlePosition;
  GoApp.prototype.handlePosition = function (position) {
    go265HandlePosition.call(this, position);
    if (!this.state.navigating || this.arrivalNotified || !this.state.destination) return;
    var point = {lat:position.coords.latitude, lon:position.coords.longitude};
    var threshold = this.state.travelMode === 'car' ? 45 : 30;
    if (haversine(point, this.state.destination) <= threshold) this.notifyArrival();
  };

  GoApp.prototype.loadEnvironment = function (point, force) {
    if (!point || !this.state.online) return Promise.resolve([]);
    var now = Date.now(), interval = this.lowPowerMode ? 180000 : 60000;
    if (!force && now - this.lastEnvironmentLoad < interval) return Promise.resolve([]);
    this.lastEnvironmentLoad = now;
    var self=this,jobs=[];
    if(this.state.features.weather!==false)jobs.push(this.api('weather',{params:{lat:point.lat,lon:point.lon}}).then(function(data){self.setState({weather:data.weather||null},function(){self.updateSafetyAlert();});}).catch(function(){}));
    var kinds=[];
    if(this.state.travelMode==='car'){if(this.state.features.speedCameras!==false)kinds.push('camera');kinds.push('speed');}
    if(this.state.showNearby){if(this.state.features.fuel!==false)kinds.push('fuel');if(this.state.features.parking!==false)kinds.push('parking');}
    if(this.state.showServices&&this.state.features.serviceAreas!==false)kinds.push('service');
    if(this.state.travelMode==='walk')kinds.push('transit');
    kinds=unique(kinds);
    if(kinds.length)jobs.push(this.api('nearby',{params:{lat:point.lat,lon:point.lon,radius:this.state.navigating?20000:9000,kinds:kinds.join(',')}}).then(function(data){self.setState({nearby:data.items||[]},function(){self.updateSafetyAlert();});}).catch(function(){}));
    return Promise.all(jobs);
  };

  GoApp.prototype.updateSafetyAlert = function () {
    var point=this.state.position||this.state.origin;if(!point){this.setState({activeAlert:null,speedLimit:null,speedOver:false,speedLimitLive:false});return;}
    var route=this.state.routes[this.state.routeIndex],userOnRoute=route&&route.coordinates?nearestOnRoute(point,route.coordinates):null;
    function ahead(item){var direct=haversine(point,item);if(!route||!route.coordinates||!userOnRoute)return direct;var hit=nearestOnRoute({lat:Number(item.lat),lon:Number(item.lon)},route.coordinates);if(!hit||hit.distance>350)return Infinity;var delta=hit.along-userOnRoute.along;return delta>=-100?Math.max(0,delta):Infinity;}
    var nearby=this.state.nearby||[];
    var candidates=nearby.map(function(item){return Object.assign({},item,{actualDistance:ahead(item)});}).filter(function(item){return isFinite(item.actualDistance);}).sort(function(a,b){return a.actualDistance-b.actualDistance;});
    var camera=candidates.filter(function(item){return item.type==='camera';})[0],service=this.state.showServices?candidates.filter(function(item){return item.type==='service';})[0]:null;
    var roadSpeed=nearby.filter(function(item){return item.type==='speed'&&Number(item.maxspeed)>0;}).map(function(item){return Object.assign({},item,{directDistance:haversine(point,item)});}).sort(function(a,b){return a.directDistance-b.directDistance;})[0];
    var traffic=(this.state.reports||[]).filter(function(item){return ['traffic','closure','roadwork','hazard','camera'].indexOf(item.type)>=0&&isFinite(Number(item.lat))&&isFinite(Number(item.lon));}).map(function(item){return Object.assign({},item,{actualDistance:ahead({lat:Number(item.lat),lon:Number(item.lon)})});}).filter(function(item){return isFinite(item.actualDistance);}).sort(function(a,b){return a.actualDistance-b.actualDistance;})[0];
    var limit=roadSpeed&&roadSpeed.directDistance<=300?Number(roadSpeed.maxspeed):null;
    if(camera&&camera.actualDistance<=2500&&Number(camera.maxspeed)>0)limit=Number(camera.maxspeed);
    var actualKmh=isFinite(point.speed)?Math.max(0,point.speed*3.6):0,liveAge=Date.now()-Number(this.liveSpeedLimitAt||0),liveMoved=this.liveSpeedLimitPoint?haversine(this.liveSpeedLimitPoint,point):Infinity;
    var liveRetained=Number(this.liveSpeedLimit||0)>0&&liveAge<180000&&liveMoved<3500,liveValid=liveRetained&&liveAge<75000&&liveMoved<1600;
    if(liveRetained)limit=Number(this.liveSpeedLimit);
    var over=!!(limit&&(this.state.speedOver?actualKmh>limit+1:actualKmh>limit+3)),alert=null;
    if(camera&&camera.actualDistance<=2500)alert={type:'camera',title:this.t('cameraAhead'),distance:camera.actualDistance,limit:Number(camera.maxspeed)||limit,over:over};
    else if(traffic&&traffic.actualDistance<=2200&&this.state.features.communityTraffic!==false)alert={type:'traffic',title:this.t('trafficAhead'),distance:traffic.actualDistance,over:false};
    else if(this.state.weather&&Array.isArray(this.state.weather.alerts)&&this.state.weather.alerts.length){var w=this.state.weather.alerts[0];alert={type:'weather',title:w.type==='ice'?this.t('iceWarning'):w.type==='snow'?this.t('snowWarning'):this.t('windWarning'),distance:null,over:w.level==='danger'};}
    else if(service&&service.actualDistance<=12000)alert={type:'service',title:this.t('serviceSoon')+(service.name?' · '+service.name:''),distance:service.actualDistance,over:false};
    this.setState({activeAlert:alert,speedLimit:limit,speedOver:over,speedLimitLive:liveValid});
  };

  GoApp.prototype.loadParkingPlaces = function (force) {
    var self=this;
    if(this.state.parkingLoading&&!force)return;
    this.setState({parkingLoading:true,parkingError:''});
    var pointPromise=this.state.position?Promise.resolve(this.state.position):this.locate(true);
    pointPromise.then(function(point){return self.api('nearby',{params:{lat:point.lat,lon:point.lon,radius:12000,kinds:'parking'}});}).then(function(data){self.setState({parkingLoading:false,parkingPlaces:(data.items||[]).filter(function(item){return item.type==='parking';}),parkingError:data.warning||''});}).catch(function(error){self.setState({parkingLoading:false,parkingPlaces:[],parkingError:error.message||self.t('noParking')});});
  };

  GoApp.prototype.renderParkingView = function () {
    var self=this, filter=this.state.parkingFilter;
    var rows=(this.state.parkingPlaces||[]).filter(function(item){var category=parkingCategory(item);return filter==='all'||category===filter;});
    return h('section',{className:'app-view page-view parking-view'},
      h('header',{className:'page-header'},h('div',null,h('span',{className:'eyebrow'},'go-app parking'),h('h1',null,this.t('parkingTitle')),h('p',null,this.t('parkingSubtitle'))),h('button',{type:'button',className:'btn ghost small',onClick:function(){self.loadParkingPlaces(true);}},'↻ ',this.t('refreshNearby'))),
      h('div',{className:'parking-tabs',role:'tablist'},[['free','freeParking'],['cheap','cheapParking'],['all','allParking']].map(function(entry){return h('button',{type:'button',key:entry[0],className:filter===entry[0]?'active':'',onClick:function(){self.setState({parkingFilter:entry[0]});}},self.t(entry[1]));})),
      this.state.parkingLoading?h('div',{className:'panel empty-state parking-status'},h('div',{className:'spinner'}),this.t('loading')):rows.length?h('div',{className:'parking-list'},rows.slice(0,40).map(function(item){var category=parkingCategory(item),label=parkingPriceLabel(item,self.t.bind(self));return h('article',{className:'panel parking-card',key:item.id},h('div',{className:'parking-card-icon'},'P'),h('div',{className:'parking-card-copy'},h('h3',null,item.name||self.t('parking')),h('p',null,formatDistance(item.distance,self.state.lang,self.state.units)+(item.capacity?' · '+item.capacity+' spaces':'')+(item.openingHours?' · '+item.openingHours:'')),h('span',{className:'parking-price '+category},label)),h('button',{type:'button',className:'btn primary small',onClick:function(){self.navigateToSelected({id:item.id,title:item.name||self.t('parking'),label:item.name||self.t('parking'),lat:item.lat,lon:item.lon,address:item.operator||''});}},self.t('navigate')));})):h('div',{className:'panel empty-state parking-status'},h('div',{className:'empty-icon'},'P'),h('strong',null,this.state.parkingError||this.t('noParking')))
    );
  };

  GoApp.prototype.renderTransitInfo = function () {
    if(this.state.travelMode!=='walk'||!this.state.destination)return null;
    var stops=(this.state.nearby||[]).filter(function(item){return item.type==='transit';}).slice(0,3),url=transitRouteUrl(this.state.position||this.state.origin,this.state.destination);
    return h('section',{className:'transit-card'},h('div',{className:'transit-heading'},h(AppIcon,{name:'bus',size:19}),h('div',null,h('strong',null,this.t('publicTransport')),h('small',null,this.t('publicTransportInfo')))),stops.length?h('div',{className:'transit-stops'},h('span',null,this.t('nearbyStops')),stops.map(function(stop){return h('small',{key:stop.id},(stop.name||'Stop')+' · '+formatDistance(stop.distance,this.state.lang,this.state.units)+(stop.routeRef?' · '+stop.routeRef:''));},this)):null,url?h('a',{className:'btn secondary small',href:url,target:'_blank',rel:'noopener noreferrer'},h(AppIcon,{name:'bus',size:16}),this.t('openTransit')):null);
  };

  GoApp.prototype.renderWelcome = function () {
    var self=this;
    return h('main',{className:'welcome-shell'},h('section',{className:'welcome-card'},
      h('a',{className:'admin-login-button',href:'?=admin',title:this.t('adminLogin'),'aria-label':this.t('adminLogin')},h(AppIcon,{name:'admin',size:20})),
      h('div',{className:'welcome-brand'},h('img',{src:'assets/icons/icon-192.png',alt:'go-app'}),h('div',null,h('strong',null,'go-app'),h('span',null,this.t('brandTagline')))),
      h('span',{className:'eyebrow'},this.t('heroEyebrow')),h('h1',null,this.t('heroTitle')),h('p',{className:'hero-copy'},this.t('heroText')),
      h('div',{className:'feature-pills'},h('span',null,'⌖ ',this.t('featureNav')),h('span',null,'◉ ',this.t('featureRadio')),h('span',null,'＋ ',this.t('featureInstall'))),
      h(LanguageSwitch,{value:this.state.lang,onChange:this.setLanguage,t:this.t.bind(this)}),
      h('button',{type:'button',className:'btn primary wide welcome-start-button',onClick:function(){self.unlockOrientation();self.setState({entered:true});if(self.state.keepAwake)self.requestWakeLock();}},this.t('continueGuest')),
      h('section',{className:'trust-panel','aria-label':this.t('privacyTitle')},h('div',{className:'trust-panel-title'},h('strong',null,this.t('privacyTitle')),h('span',null,this.t('noTracking'))),h('p',null,this.t('privacyText')),h('div',{className:'trust-points'},h('span',null,'⌖ ',this.t('localResults')),h('span',null,'◔ ',this.t('batterySmart')))),
      this.renderAdvertCard(true),
      h('div',{className:'welcome-actions'},h('button',{type:'button',className:'btn ghost',onClick:function(){self.setState({modal:'auth',authMode:'login'});}},this.t('signIn')),h('button',{type:'button',className:'btn ghost',onClick:function(){self.setState({modal:'auth',authMode:'register'});}},this.t('createAccount'))),
      !this.state.installed?h(InstallPlatforms,{onInstall:this.installApp,t:this.t.bind(this)}):null,
      h('div',{className:'welcome-footer-actions'},h('button',{type:'button',className:'support-link',onClick:function(){self.setState({modal:'feedback'});}},this.t('contactUs')+' · '+this.t('feedback')),this.state.app.newsletter&&this.state.app.newsletter.enabled?h('button',{type:'button',className:'support-link newsletter-link',onClick:function(){self.setState({modal:'newsletter'});}},this.t('subscribeNews')):null)
    ));
  };

  GoApp.prototype.renderMapView = function () {
    var self=this,route=this.state.routes[this.state.routeIndex],playerActive=!!this.state.player.station,weather=this.state.weather?weatherVisual(this.state.weather):null;
    var nearbyCards=(this.state.nearby||[]).filter(function(item){return item.type==='fuel'||item.type==='parking'||(item.type==='service'&&self.state.showServices)||(item.type==='transit'&&self.state.travelMode==='walk');}).slice(0,4);
    return h('section',{className:'app-view map-view'+(this.state.navigating?' is-navigating':'')},
      h('div',{className:'map-host',ref:function(node){self.mapNode=node;}}),
      !this.state.navigating?h('div',{className:'map-top-stack'},h('div',{className:'map-command-row'},this.renderModeSelector(),h('div',{className:'destination-search'},h('span',{className:'search-pin'},h(AppIcon,{name:'search',size:19})),h('input',{className:'destination-input',type:'search',inputMode:'search',enterKeyHint:'search',autoComplete:'street-address',value:this.state.destinationQuery,onChange:this.handleDestinationInput,onFocus:function(){var html=document.documentElement;self.addressEditing=true;html.classList.add('address-entry-active');html.classList.add('keyboard-active');if(self.viewportHandler)self.viewportHandler();},onBlur:function(){clearTimeout(self.addressEntryBlurTimer);self.addressEntryBlurTimer=setTimeout(function(){var active=document.activeElement;if(!active||!active.classList||!active.classList.contains('destination-input')){self.addressEditing=false;document.documentElement.classList.remove('address-entry-active');if(!goAppEditableElement(active))document.documentElement.classList.remove('keyboard-active');if(self.viewportHandler)self.viewportHandler();}},260);},placeholder:this.t('destinationPlaceholder'),'aria-label':this.t('destinationPlaceholder')}),this.renderCountrySelect(true))),(this.state.searching||this.state.suggestions.length)?h('div',{className:'suggestions'},this.state.searching?h('div',{className:'empty-state'},this.t('searching')):this.state.suggestions.map(function(place){return h('button',{type:'button',className:'suggestion',key:place.id,onClick:function(){self.selectSuggestion(place);}},h('span',{className:'suggestion-icon'},h(AppIcon,{name:'pin',size:18})),h('span',null,h('b',null,place.title||String(place.label).split(',')[0]),h('span',null,place.address||place.label)));})):null,h('div',{className:'map-status-row'},weather?h('button',{type:'button',className:'status-chip weather-chip',title:weather.wet?this.t('rainNow'):this.t('dryNow'),onClick:function(){self.loadEnvironment(self.state.position||self.state.origin,true);}},weather.icon+' ',weather.temperature+'°'):null,this.state.lang==='lv'&&this.state.namedays.length?h('span',{className:'status-chip nameday-chip'},'✦ ',this.t('todaysNamedays'),': ',this.state.namedays.join(', ')):null,(this.state.destination||this.state.routes.length||this.state.searchResults.length)?h('button',{type:'button',className:'status-chip back-search-chip',onClick:function(){self.setView('search');}},h(AppIcon,{name:'arrowLeft',size:14}),' ',this.t('backToSearch')):null,this.state.resumeTrip&&!this.state.navigating?h('button',{type:'button',className:'status-chip resume-chip',onClick:this.startNavigation},'▶ ',this.t('resume')):null,this.state.spotifyStatus&&this.state.spotifyStatus.connected&&this.state.spotifyStatus.playback&&this.state.spotifyStatus.playback.item?h('button',{type:'button',className:'status-chip spotify-chip',onClick:function(){self.spotifyControl(self.state.spotifyStatus.playback.is_playing?'pause':'play');}},'♫ ',this.state.spotifyStatus.playback.item.name,' ',this.state.spotifyStatus.playback.is_playing?'Ⅱ':'▶'):null)):null,
      h('div',{className:'map-tools'},h(IconButton,{icon:h(AppIcon,{name:'zoomIn'}),title:this.t('zoomIn'),onClick:function(){if(self.map)self.map.setZoom(self.map.zoom+1);}}),h(IconButton,{icon:h(AppIcon,{name:'zoomOut'}),title:this.t('zoomOut'),onClick:function(){if(self.map)self.map.setZoom(self.map.zoom-1);}}),h(IconButton,{icon:h(AppIcon,{name:'locate'}),title:this.t('follow'),active:this.state.follow,onClick:function(){self.setState({follow:true});if(self.state.position&&self.map)self.map.setView(self.state.position,16);else self.locate(false).catch(function(error){self.showToast(error.message,true);});}}),h(IconButton,{icon:h(AppIcon,{name:'reset'}),title:this.t('resetView'),onClick:this.resetMapView}),h(IconButton,{icon:h(AppIcon,{name:'rotate'}),title:this.t('rotateScreen'),onClick:this.toggleOrientation}),h(IconButton,{icon:h(AppIcon,{name:'layers'}),title:this.t('mapStyle'),onClick:function(){self.setMapStyle(self.state.mapStyle==='road'?'satellite':'road');}})),
      !this.state.navigating?h('div',{className:'map-side-action'},h(IconButton,{icon:h(AppIcon,{name:'report'}),title:this.t('report'),onClick:function(){self.setState({modal:'report'});}})):null,
      this.state.activeAlert?h('div',{className:'safety-alert '+(this.state.activeAlert.over?'danger':'')},h('b',null,this.state.activeAlert.type==='camera'?'📷':this.state.activeAlert.type==='weather'?'❄':this.state.activeAlert.type==='service'?'🅂':'⚠'),h('span',null,h('strong',null,this.state.activeAlert.title),this.state.activeAlert.distance!=null?h('small',null,formatDistance(this.state.activeAlert.distance,this.state.lang,this.state.units)+(this.state.activeAlert.limit?' · '+this.t('speedLimit')+' '+(this.state.units==='mi'?Math.round(this.state.activeAlert.limit/1.609344)+' mph':this.state.activeAlert.limit+' km/h'):'')):null),this.state.activeAlert.over?h('em',null,this.t('overSpeed')):null):null,
      this.state.navigating?this.renderNavigationHud():null,
      route&&!this.state.navigating?h('section',{className:'route-sheet with-nav'},h('div',{className:'route-summary'},h('div',null,h('h3',null,this.t('routeReady')),h('p',null,this.state.destination?this.state.destination.label:'')),h('span',{className:'eyebrow'},this.state.travelMode==='bike'?this.t('cyclingRecommended'):this.t(this.state.travelMode))),this.state.routes.length>1?h('div',{className:'route-options'},this.state.routes.map(function(item,index){return h('button',{type:'button',key:item.id,className:self.state.routeIndex===index?'active':'',onClick:function(){self.selectRoute(index);}},h('strong',null,(self.state.travelMode==='bike'&&index===0)?self.t('cyclingRecommended'):self.t('routeOption')+' '+(index+1)),h('small',null,formatDuration(item.duration,self.state.lang)+' · '+formatDistance(item.distance,self.state.lang,self.state.units)));})):null,h('div',{className:'route-stats'},h('div',{className:'route-stat'},h('strong',null,formatDistance(route.distance,this.state.lang,this.state.units)),h('span',null,this.t('routeDistance'))),h('div',{className:'route-stat'},h('strong',null,formatDuration(route.duration,this.state.lang)),h('span',null,this.t('routeTime')))),this.state.travelMode==='bike'?h('p',{className:'cycling-note'},this.t('cyclingNote')):null,this.renderTransitInfo(),h('div',{className:'route-actions'},h('button',{className:'btn primary',type:'button',onClick:this.startNavigation},h(AppIcon,{name:'navigation',size:18}),' ',this.t('startNavigation')),h(IconButton,{icon:h(AppIcon,{name:'save'}),title:this.t('savePlace'),onClick:function(){self.setState({modal:'save'});}}))):null,
      !route&&!this.state.navigating&&this.state.routing?h('section',{className:'route-sheet with-nav'},h('div',{className:'empty-state'},h('div',{className:'spinner'}),this.t('loading'))):null,
      !this.state.navigating&&nearbyCards.length?h('div',{className:'nearby-strip'},nearbyCards.map(function(item){return h('button',{type:'button',key:item.id,onClick:function(){self.navigateToSelected({id:item.id,title:item.name,label:item.name,lat:item.lat,lon:item.lon,address:item.operator||''});}},h('b',null,item.type==='fuel'?'⛽':item.type==='service'?'S':item.type==='transit'?'▣':'P'),h('span',null,h('strong',null,item.name),h('small',null,formatDistance(item.distance,self.state.lang,self.state.units)+' · '+(item.type==='transit'?(item.routeRef||self.t('publicTransport')):(item.price||item.charge||item.fee||self.t('priceUnavailable'))))));})):null,
      this.renderAdvertCard(false)
    );
  };

  GoApp.prototype.renderNavigationHud = function () {
    var self=this,speed=formatSpeed(this.state.position&&this.state.position.speed,this.state.units),eta=this.state.remainingDuration!=null?new Date(Date.now()+this.state.remainingDuration*1000):null,limit=this.state.speedLimit,weather=this.state.weather?weatherVisual(this.state.weather):null;
    var limitValue=limit?(this.state.units==='mi'?Math.round(limit/1.609344):Math.round(limit)):'—';
    return h('div',{className:'navigation-layer'},h('div',{className:'navigation-hud'},h('div',{className:'instruction-card'},h('div',{className:'turn-icon'},this.turnIcon()),h('div',{className:'instruction-copy'},h('h3',null,this.state.rerouting?this.t('rerouting'):this.currentInstruction()),h('p',null,this.state.wakeLock?this.t('wakeLockOn'):this.t('wakeLockOff'))),h('div',{className:'nav-right-cluster'},weather?h('div',{className:'nav-weather-mini',title:weather.wet?this.t('rainNow'):this.t('dryNow')},h('span',null,weather.icon),h('strong',null,weather.temperature+'°')):null,h('div',{className:'speed-pair'},h('div',{className:'speed-limit '+(this.state.speedOver?'over':'')},h('strong',null,limitValue==='—'?'?':limitValue),h('small',{className:'speed-limit-label '+(this.state.speedLimitLive?'is-live':'')},h('i',{'aria-hidden':'true'}),this.t('allowedSpeed')))))),h('div',{className:'live-metrics'},h('div',{className:'live-metric'},h('strong',null,formatDistance(this.state.remainingDistance,this.state.lang,this.state.units)),h('span',null,this.t('remaining'))),h('div',{className:'live-metric'},h('strong',null,eta?formatTime(eta,this.state.lang):'—'),h('span',null,this.t('eta'))),h('div',{className:'live-metric speed-metric '+(this.state.speedOver?'over':'')},h('strong',{className:'speed-readout'},h('b',null,speed.value),h('small',null,speed.label)),h('span',null,this.t('speed'))))),h('div',{className:'exit-navigation','aria-label':this.t('exitNavigation')},h('button',{type:'button',className:'btn secondary small',title:this.t('exitSearch'),'aria-label':this.t('exitSearch'),onClick:function(){self.exitNavigationTo('search');}},h(AppIcon,{name:'search',size:18}),h('span',null,this.t('exitSearch'))),h('button',{type:'button',className:'btn secondary small',title:this.t('exitHome'),'aria-label':this.t('exitHome'),onClick:function(){self.exitNavigationTo('home');}},h(AppIcon,{name:'arrowLeft',size:18}),h('span',null,this.t('exitHome'))),h('button',{type:'button',className:'btn danger small',title:this.t('stopNavigation'),'aria-label':this.t('stopNavigation'),onClick:this.stopNavigation},h(AppIcon,{name:'stop',size:17}),h('span',null,this.t('stopNavigation')))));
  };

  GoApp.prototype.renderSearchView = function () {
    var self=this,results=normalisePlaceResults(this.state.searchResults);
    function resourceLink(place,kind,label,url,icon){return h('a',{className:'place-resource-link '+kind,href:url,target:'_blank',rel:'noopener noreferrer',title:label,'aria-label':label,onClick:function(event){event.stopPropagation();}},icon?h(AppIcon,{name:icon,size:16}):label.charAt(0));}
    function resultCard(place,index){var meta=[place.type,place.country].filter(Boolean).join(' · '),locality=[place.city,place.postcode].filter(Boolean).join(' · ');return h('article',{className:'panel place-result',key:place.id||('result-'+index)},h('button',{type:'button',className:'place-result-main',onClick:function(){self.openPlace(place);}},h('div',{className:'place-result-title'},h('span',{className:'place-kind','aria-hidden':'true'},h(AppIcon,{name:'pin',size:18})),h('div',null,h('h3',null,place.title),meta?h('p',null,meta):null)),h('div',{className:'place-result-address'},h('strong',null,place.address||place.label),locality?h('span',null,locality):null)),h('div',{className:'place-result-actions'},h('div',{className:'place-resource-links'},resourceLink(place,'wiki',self.t('wikipedia'),wikipediaUrl(place,self.state.lang),'book'),resourceLink(place,'photos',self.t('photos'),photoSearchUrl(place),'photo')),h('button',{type:'button',className:'btn primary small place-navigate-button',onClick:function(){self.navigateToSelected(place);}},self.t('navigate'))));}
    var content=this.state.searchLoading?h('div',{className:'panel empty-state search-status','aria-live':'polite'},h('div',{className:'spinner'}),this.t('searching')):results.length?h('div',{className:'place-results','aria-live':'polite'},results.map(resultCard)):this.state.searchHasRun?h('div',{className:'panel empty-state search-status','aria-live':'polite'},h('div',{className:'empty-icon','aria-hidden':'true'},'⌕'),h('strong',null,this.state.searchError||this.t('noResults')),h('button',{type:'button',className:'btn secondary small',onClick:function(){self.handlePlaceSearch();}},this.t('retry'))):h('div',{className:'panel empty-state search-status'},h('div',{className:'empty-icon','aria-hidden':'true'},'⌕'),this.t('chooseResult'));
    return h('section',{className:'app-view page-view search-view'},h('header',{className:'page-header'},h('div',null,h('span',{className:'eyebrow'},'go-app places'),h('h1',null,this.t('placeSearchTitle')),h('p',null,this.t('searchAllEurope'))),h('button',{type:'button',className:'btn ghost small back-map-button',onClick:function(){self.setView('map');}},h(AppIcon,{name:'arrowLeft',size:16}),' ',this.t('backToMap'))),h('div',{className:'place-country-filter'},h('span',null,this.t('selectCountry')),this.renderCountrySelect()),h('form',{className:'place-search-form',onSubmit:this.handlePlaceSearch,action:'#',noValidate:true},h('div',{className:'search-box large'},h(AppIcon,{name:'search',size:21}),h('input',{value:this.state.searchQuery,onChange:function(e){self.setState({searchQuery:e.target.value,searchError:''});},placeholder:this.t('placeSearchTitle'),type:'search',inputMode:'search',enterKeyHint:'search',autoComplete:'off','aria-label':this.t('placeSearchTitle')}),this.state.searchQuery?h('button',{type:'button',className:'search-clear','aria-label':this.t('close'),onClick:function(){self.placeSearchSequence++;self.setState({searchQuery:'',searchResults:[],searchError:'',searchHasRun:false,searchLoading:false});}},'×'):null,h('button',{type:'submit',className:'btn primary small search-submit-icon',disabled:this.state.searchLoading,'aria-label':this.t('search'),title:this.t('search')},this.state.searchLoading?h('span',{className:'mini-spinner','aria-hidden':'true'}):h(AppIcon,{name:'search',size:20})))),this.state.searchError&&results.length?h('div',{className:'panel search-warning','aria-live':'polite'},this.state.searchError):null,content);
  };

  GoApp.prototype.renderPlaceModal = function () {
    var self=this,p=this.state.selectedPlace;if(!p)return null;
    function row(label,value,link){if(!value)return null;return h('div',{className:'detail-row'},h('span',null,label),link?h('a',{href:link,target:'_blank',rel:'noopener noreferrer'},value):h('strong',null,value));}
    var resources=[{key:'wikipedia',label:this.t('wikipedia'),url:wikipediaUrl(p,this.state.lang),icon:'book'},{key:'photos',label:this.t('photos'),url:photoSearchUrl(p),icon:'photo'},{key:'web',label:this.t('webSearch'),url:webSearchUrl(p),icon:'search'},{key:'map',label:this.t('openMap'),url:mapResourceUrl(p),icon:'map'}];
    if(p.wikidata&&/^Q\d+$/i.test(p.wikidata))resources.push({key:'wikidata',label:'Wikidata',url:'https://www.wikidata.org/wiki/'+encodeURIComponent(p.wikidata),icon:'book'});
    return h(Modal,{title:p.title||this.t('placeDetails'),closeLabel:this.t('close'),onClose:this.dismissModal},h('div',{className:'place-detail-card'},h('p',{className:'place-full-label'},p.label||p.address),row(this.t('address'),p.address),row(this.t('townCity'),p.city),row(this.t('postcode'),p.postcode),row(this.t('openingHours'),p.openingHours),row(this.t('phone'),p.phone,p.phone?'tel:'+p.phone:null),row(this.t('website'),p.website,p.website),h('section',{className:'place-resources'},h('strong',null,this.t('externalResources')),h('div',null,resources.map(function(resource){return h('a',{key:resource.key,href:resource.url,target:'_blank',rel:'noopener noreferrer',className:'resource-button'},h(AppIcon,{name:resource.icon,size:17}),resource.label);}))),h('button',{type:'button',className:'btn primary wide',onClick:function(){self.navigateToSelected(p);}},h(AppIcon,{name:'navigation',size:18}),' ',this.t('navigate'))));
  };

  GoApp.prototype.renderBottomNav = function () {
    var self=this,items=[{view:'map',icon:'map',label:'navMap'},{view:'search',icon:'search',label:'navSearch'},{view:'parking',icon:'parking',label:'navParking'},{view:'radio',icon:'radio',label:'navRadio'},{view:'reports',icon:'report',label:'navReports'},{view:'profile',icon:'profile',label:'navProfile'}];
    return h('nav',{className:'bottom-nav','aria-label':'go-app'},items.map(function(item){return h('button',{type:'button',key:item.view,className:self.state.view===item.view?'active':'',onClick:function(){self.setView(item.view);}},item.view==='radio'&&self.isPlayerActive()?h('i',{className:'playing-dot'}):null,h('span',{className:'nav-icon'},h(AppIcon,{name:item.icon,size:21})),h('span',null,self.t(item.label)));}));
  };

  GoApp.prototype.renderApp = function () {
    var view;if(this.state.view==='search')view=this.renderSearchView();else if(this.state.view==='parking')view=this.renderParkingView();else if(this.state.view==='radio')view=this.renderRadioView();else if(this.state.view==='reports')view=this.renderReportsView();else if(this.state.view==='profile')view=this.renderProfileView();else view=this.renderMapView();
    var showPlayer=this.state.player.station&&(this.state.view!=='map'||(!this.state.navigating&&!this.state.routes.length));
    return h('main',{className:'app-shell'+(this.state.navigating?' navigating-shell':'')},h('div',{className:'app-content'},view),showPlayer?this.renderPlayer():null,this.renderBottomNav(),this.renderModal(),this.state.toast?h('div',{className:'toast show'+(this.state.toastError?' error':'')},this.state.toast):null,this.state.loading?h('div',{className:'global-loader'},h('div',{className:'spinner'})):null);
  };

  GoApp.prototype.render = function () {
    if (this.state.booting) return this.renderLoading();
    if (!this.state.entered) return h('div', {className:'welcome-root'}, this.renderWelcome(), this.renderModal(), this.state.toast && h('div', {className:'toast show' + (this.state.toastError ? ' error' : '')}, this.state.toast), this.state.loading && h('div', {className:'global-loader'}, h('div', {className:'spinner'})));
    return this.renderApp();
  };

  var go268DidUpdate = GoApp.prototype.componentDidUpdate;
  GoApp.prototype.componentDidUpdate = function (prevProps, prevState) {
    go268DidUpdate.call(this, prevProps, prevState);
    if (prevState.destinationQuery !== this.state.destinationQuery ||
        prevState.searchQuery !== this.state.searchQuery ||
        prevState.searchResults !== this.state.searchResults ||
        prevState.searchHasRun !== this.state.searchHasRun ||
        prevState.selectedPlace !== this.state.selectedPlace ||
        prevState.destination !== this.state.destination ||
        prevState.routes !== this.state.routes ||
        prevState.routeIndex !== this.state.routeIndex ||
        prevState.travelMode !== this.state.travelMode ||
        prevState.navCountry !== this.state.navCountry) {
      this.scheduleNavigationCache();
      if (this.state.destination && this.state.routes.length) this.saveTrip();
    }
  };

  var go268SetView = GoApp.prototype.setView;
  GoApp.prototype.setView = function (view) {
    this.saveNavigationCache();
    if (this.state.destination && this.state.routes.length) this.saveTrip();
    return go268SetView.call(this, view);
  };



  /* go-app 2.6.10: keyboard-stable address entry and dependable landscape fallback */
  function goAppEditableElement(node) {
    if (!node || node === document.body) return false;
    var tag = String(node.tagName || '').toLowerCase();
    if (tag === 'textarea' || node.isContentEditable === true) return true;
    if (tag !== 'input') return false;
    var type = String(node.type || 'text').toLowerCase();
    return ['button','checkbox','color','file','hidden','image','radio','range','reset','submit'].indexOf(type) < 0;
  }

  function goAppPhysicalLandscape() {
    /* Screen dimensions do not collapse when the mobile keyboard opens and are
       therefore a more reliable first signal than visualViewport or a stale
       screen.orientation.type value. */
    var screenWidth = Number(window.screen && window.screen.width || 0);
    var screenHeight = Number(window.screen && window.screen.height || 0);
    if (screenWidth > 0 && screenHeight > 0 && Math.abs(screenWidth - screenHeight) > 24) return screenWidth > screenHeight;
    var orientation = window.screen && window.screen.orientation;
    var type = orientation && orientation.type ? String(orientation.type) : '';
    if (type.indexOf('landscape') === 0) return true;
    if (type.indexOf('portrait') === 0) return false;
    if (typeof window.orientation === 'number') return Math.abs(Number(window.orientation)) % 180 === 90;
    if (window.matchMedia) {
      try { return window.matchMedia('(orientation: landscape)').matches; } catch (_) {}
    }
    return (window.innerWidth || document.documentElement.clientWidth) > (window.innerHeight || document.documentElement.clientHeight);
  }

  var go269DidMount = GoApp.prototype.componentDidMount;
  GoApp.prototype.componentDidMount = function () {
    var result = go269DidMount.call(this);
    var self = this, html = document.documentElement;

    /* Remove the previous visualViewport-driven handlers. A mobile keyboard can
       make visualViewport wider than it is tall and was falsely activating the
       landscape layout while an address was being entered. */
    if (this.viewportHandler) {
      window.removeEventListener('resize', this.viewportHandler);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', this.viewportHandler);
    }
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
      document.removeEventListener('fullscreenchange', this.orientationHandler);
      document.removeEventListener('webkitfullscreenchange', this.orientationHandler);
      if (window.screen && window.screen.orientation && typeof window.screen.orientation.removeEventListener === 'function') {
        window.screen.orientation.removeEventListener('change', this.orientationHandler);
      }
    }

    this.stableViewportHeights = this.stableViewportHeights || {};
    this.lastViewportWidth = 0;
    this.lastOrientationKey = '';

    function applyViewport() {
      self.viewportFrame = null;
      var physicalLandscape = goAppPhysicalLandscape();
      if (physicalLandscape && html.classList.contains('force-landscape')) html.classList.remove('force-landscape');
      var forcedLandscape = html.classList.contains('force-landscape');
      var landscape = physicalLandscape || forcedLandscape;
      var orientationKey = landscape ? 'landscape' : 'portrait';
      var orientationChanged = self.lastOrientationKey !== orientationKey;
      var focused = goAppEditableElement(document.activeElement);
      var rawWidth = Math.max(240, Math.round(window.innerWidth || document.documentElement.clientWidth || 360));
      var rawHeight = Math.max(240, Math.round(window.innerHeight || document.documentElement.clientHeight || 640));
      var layoutWidth = forcedLandscape ? rawHeight : rawWidth;
      var layoutHeight = forcedLandscape ? rawWidth : rawHeight;
      var previousHeight = Number(self.stableViewportHeights[orientationKey] || 0);

      /* Browser address-bar movement is small and should not move the whole UI.
         Orientation changes are large and are applied immediately. While an
         input is focused, preserve the last full layout height so the keyboard
         cannot collapse the map and search controls. */
      if (!previousHeight || orientationChanged || (!focused && Math.abs(previousHeight - layoutHeight) > 140)) {
        self.stableViewportHeights[orientationKey] = layoutHeight;
        previousHeight = layoutHeight;
      }

      var visual = window.visualViewport;
      var visualHeight = visual && visual.height ? Math.round(visual.height) : layoutHeight;
      html.style.setProperty('--app-width', layoutWidth + 'px');
      html.style.setProperty('--app-height', Math.max(240, previousHeight || layoutHeight) + 'px');
      html.style.setProperty('--keyboard-viewport-height', Math.max(180, visualHeight) + 'px');
      html.classList.toggle('is-landscape', landscape);
      html.classList.toggle('is-portrait', !landscape);
      html.classList.toggle('keyboard-active', focused);

      var widthChanged = Math.abs(self.lastViewportWidth - layoutWidth) > 8;
      self.lastViewportWidth = layoutWidth;
      self.lastOrientationKey = orientationKey;
      if (self.map && (orientationChanged || widthChanged || !focused)) {
        setTimeout(function () { if (self.map) self.map.scheduleRender(); }, orientationChanged ? 120 : 0);
      }
    }

    this.viewportHandler = function () {
      if (self.viewportFrame) cancelAnimationFrame(self.viewportFrame);
      self.viewportFrame = requestAnimationFrame(applyViewport);
    };
    this.orientationHandler = function () {
      (self.orientationTimers || []).forEach(function (timer) { clearTimeout(timer); });
      self.viewportHandler();
      self.orientationTimers = [120, 360, 760].map(function (delay) {
        return setTimeout(self.viewportHandler, delay);
      });
    };
    this.inputFocusHandler = function (event) {
      if (!goAppEditableElement(event.target)) return;
      self.addressEditing = true;
      html.classList.add('keyboard-active');
      self.viewportHandler();
      clearTimeout(self.inputVisibilityTimer);
      self.inputVisibilityTimer = setTimeout(function () {
        try { event.target.scrollIntoView({block:'nearest', inline:'nearest', behavior:'auto'}); } catch (_) {}
      }, 180);
    };
    this.inputBlurHandler = function () {
      clearTimeout(self.inputVisibilityTimer);
      self.inputVisibilityTimer = setTimeout(function () {
        if (!goAppEditableElement(document.activeElement)) {
          self.addressEditing = false;
          html.classList.remove('keyboard-active');
          self.saveTrip();
        }
        self.viewportHandler();
      }, 220);
    };

    window.addEventListener('resize', this.viewportHandler, {passive:true});
    window.addEventListener('orientationchange', this.orientationHandler, {passive:true});
    document.addEventListener('fullscreenchange', this.orientationHandler);
    document.addEventListener('webkitfullscreenchange', this.orientationHandler);
    document.addEventListener('focusin', this.inputFocusHandler);
    document.addEventListener('focusout', this.inputBlurHandler);
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') {
      window.screen.orientation.addEventListener('change', this.orientationHandler);
    }
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.viewportHandler, {passive:true});
    this.viewportHandler();
    return result;
  };

  var go269WillUnmount = GoApp.prototype.componentWillUnmount;
  GoApp.prototype.componentWillUnmount = function () {
    document.removeEventListener('focusin', this.inputFocusHandler);
    document.removeEventListener('focusout', this.inputBlurHandler);
    clearTimeout(this.inputVisibilityTimer);
    if (this.viewportFrame) cancelAnimationFrame(this.viewportFrame);
    return go269WillUnmount.call(this);
  };

  GoApp.prototype.toggleOrientation = function () {
    var self = this, html = document.documentElement;
    var orientation = window.screen && window.screen.orientation;
    var forced = html.classList.contains('force-landscape');
    var physicalLandscape = goAppPhysicalLandscape();

    function refresh() {
      if (self.orientationHandler) self.orientationHandler();
      else if (self.viewportHandler) self.viewportHandler();
    }
    function useSoftwareLandscape() {
      html.classList.add('force-landscape');
      html.classList.add('is-landscape');
      html.classList.remove('is-portrait');
      refresh();
    }

    /* Pressing rotate again while software landscape is active restores the
       normal portrait/automatic layout. */
    if (forced) {
      html.classList.remove('force-landscape');
      this.unlockOrientation();
      refresh();
      return;
    }

    var target = physicalLandscape ? 'portrait' : 'landscape';
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    var fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    var rootNode = document.documentElement;
    var requestFullscreen = rootNode.requestFullscreen || rootNode.webkitRequestFullscreen;

    function lockTarget() {
      if (!orientation || typeof orientation.lock !== 'function') return Promise.reject(new Error('orientation-lock-unavailable'));
      return Promise.race([
        Promise.resolve(orientation.lock(target)),
        new Promise(function (_, reject) { setTimeout(function () { reject(new Error('orientation-lock-timeout')); }, 1400); })
      ]);
    }

    if (target === 'portrait') html.classList.remove('force-landscape');

    var ready = Promise.resolve();
    if (!fullscreen && !standalone && typeof requestFullscreen === 'function') {
      ready = Promise.resolve(requestFullscreen.call(rootNode, {navigationUI:'hide'})).catch(function () { return null; });
    }
    ready.then(lockTarget).then(function () {
      html.classList.remove('force-landscape');
      refresh();
    }).catch(function () {
      if (target === 'landscape') useSoftwareLandscape();
      else {
        self.unlockOrientation();
        refresh();
      }
    });
  };

  var go269SaveTrip = GoApp.prototype.saveTrip;
  GoApp.prototype.saveTrip = function () {
    if (this.addressEditing && !this.state.navigating) return;
    return go269SaveTrip.call(this);
  };

  var go269MapScheduleRender = TileMap.prototype.scheduleRender;
  TileMap.prototype.scheduleRender = function () {
    if (document.documentElement.classList.contains('keyboard-active') && !this.dragging) {
      this.keyboardRenderPending = true;
      return;
    }
    this.keyboardRenderPending = false;
    return go269MapScheduleRender.call(this);
  };

  GoApp.prototype.handleDestinationInput = function (event) {
    var self = this, value = event.target.value;
    clearTimeout(this.searchTimer);
    /* Preserve the current route while the user types. Removing it on every
       keypress forced a full map redraw and made the screen jump. */
    var next = {destinationQuery:value, suggestions:[]};
    if (!value.trim()) {
      next.destination = null;
      next.routes = [];
      next.routeIndex = 0;
    }
    this.setState(next);
    if (value.trim().length < 2) return;
    /* Older phones need a slightly longer pause before geocoding. This avoids
       firing requests while the user is still typing and saves both battery
       and public/provider/server traffic. */
    this.searchTimer = setTimeout(function () { self.searchPlaces(value); }, this.lowPowerMode ? 650 : 420);
  };


  /* go-app 2.6.11: focused address layout and true fullscreen navigation */
  GoApp.prototype.requestMobileFullscreen = function () {
    var standalone = (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true;
    if (standalone || document.fullscreenElement || document.webkitFullscreenElement) return Promise.resolve(true);
    var node = document.documentElement;
    var request = node.requestFullscreen || node.webkitRequestFullscreen;
    if (typeof request !== 'function') return Promise.resolve(false);
    try {
      var result = request.call(node, {navigationUI:'hide'});
      return Promise.resolve(result).then(function(){return true;}).catch(function(){return false;});
    } catch (_) {
      try { return Promise.resolve(request.call(node)).then(function(){return true;}).catch(function(){return false;}); }
      catch (__) { return Promise.resolve(false); }
    }
  };

  var go2610StartNavigation = GoApp.prototype.startNavigation;
  GoApp.prototype.startNavigation = function () {
    this.requestMobileFullscreen();
    document.documentElement.classList.remove('address-entry-active');
    return go2610StartNavigation.apply(this, arguments);
  };


  /* go-app 2.6.12: compact travel selector, persistent routes, stable map UI and arrival workflow */
  Object.assign(I18N.en,{
    activeRoute:'Active route',continueRoute:'Continue route',newSearch:'New search',arrivalPrompt:'You reached your destination. Report a road issue or start a new search.',reportIssue:'Report an issue',
    spotifySetupRequired:'Spotify must be enabled in Admin and the redirect URL below must be added to the Spotify developer app.',spotifyRedirectUrl:'Spotify redirect URL',spotifyConnectHelp:'Sign in with Spotify and control an active Spotify device from go-app.'
  });
  Object.assign(I18N.lv,{
    activeRoute:'Aktīvs maršruts',continueRoute:'Turpināt maršrutu',newSearch:'Jauna meklēšana',arrivalPrompt:'Galamērķis ir sasniegts. Ziņo par ceļa problēmu vai sāc jaunu meklēšanu.',reportIssue:'Ziņot par problēmu',
    spotifySetupRequired:'Spotify jāieslēdz administratora panelī, un zemāk redzamā pāradresācijas adrese jāpievieno Spotify izstrādātāja lietotnei.',spotifyRedirectUrl:'Spotify pāradresācijas adrese',spotifyConnectHelp:'Pieslēdzies Spotify un vadi aktīvu Spotify ierīci no go-app.'
  });
  Object.assign(I18N.ru,{
    activeRoute:'Активный маршрут',continueRoute:'Продолжить маршрут',newSearch:'Новый поиск',arrivalPrompt:'Вы достигли пункта назначения. Сообщите о проблеме на дороге или начните новый поиск.',reportIssue:'Сообщить о проблеме',
    spotifySetupRequired:'Spotify нужно включить в панели администратора и добавить указанный адрес перенаправления в приложение Spotify.',spotifyRedirectUrl:'Адрес перенаправления Spotify',spotifyConnectHelp:'Войдите в Spotify и управляйте активным устройством Spotify из go-app.'
  });
  Object.assign(I18N.uk,{
    activeRoute:'Активний маршрут',continueRoute:'Продовжити маршрут',newSearch:'Новий пошук',arrivalPrompt:'Ви прибули до місця призначення. Повідомте про проблему на дорозі або почніть новий пошук.',reportIssue:'Повідомити про проблему',
    spotifySetupRequired:'Spotify потрібно увімкнути в панелі адміністратора та додати вказану адресу переспрямування до застосунку Spotify.',spotifyRedirectUrl:'Адреса переспрямування Spotify',spotifyConnectHelp:'Увійдіть у Spotify і керуйте активним пристроєм Spotify з go-app.'
  });

  GoApp.prototype.renderModeSelector = function () {
    var self=this,mode=['car','bike','walk'].indexOf(this.state.travelMode)>=0?this.state.travelMode:'car';
    return h('label',{className:'mode-dropdown',title:this.t('travelMode'),'aria-label':this.t('travelMode')},
      h('span',{className:'mode-dropdown-icon','aria-hidden':'true'},h(AppIcon,{name:mode,size:23})),
      h('span',{className:'mode-dropdown-label'},this.t(mode)),
      h('span',{className:'mode-dropdown-caret','aria-hidden':'true'},'⌄'),
      h('select',{value:mode,'aria-label':this.t('travelMode'),onChange:function(event){self.setTravelMode(event.target.value);}},
        ['car','bike','walk'].map(function(item){return h('option',{key:item,value:item},self.t(item));})
      )
    );
  };

  /* Keep an interrupted route available from Search instead of making the user
     select the destination again. */
  var go2612RenderSearchView = GoApp.prototype.renderSearchView;
  GoApp.prototype.renderSearchView = function () {
    var view=go2612RenderSearchView.call(this),route=this.state.routes[this.state.routeIndex],self=this;
    if(!view||!route||!this.state.destination)return view;
    var children=React.Children.toArray(view.props.children);
    children.splice(2,0,h('section',{className:'panel active-trip-card','aria-live':'polite'},
      h('span',{className:'active-trip-icon'},h(AppIcon,{name:'navigation',size:20})),
      h('div',{className:'active-trip-copy'},h('strong',null,this.t('activeRoute')),h('span',null,this.state.destination.label||this.state.destination.title||''),h('small',null,formatDistance(route.distance,this.state.lang,this.state.units)+' · '+formatDuration(route.duration,this.state.lang))),
      h('button',{type:'button',className:'btn primary small',onClick:function(){self.setState({view:'map',resumeTrip:true},function(){self.initMapSoon();self.startNavigation();});}},h(AppIcon,{name:'navigation',size:17}),this.t('continueRoute'))
    ));
    return React.cloneElement(view,view.props,children);
  };

  var go2612ExitNavigationTo = GoApp.prototype.exitNavigationTo;
  GoApp.prototype.exitNavigationTo = function (target) {
    if(target!=='search')return go2612ExitNavigationTo.call(this,target);
    if(this.watchId!=null){navigator.geolocation.clearWatch(this.watchId);this.watchId=null;}
    this.offRouteSince=null;
    var self=this;
    this.setState({navigating:false,resumeTrip:true,wakeLock:false,rerouting:false,currentStep:null,activeAlert:null,view:'search',entered:true,modal:null},function(){self.saveTrip();self.saveNavigationCache();});
  };

  /* Save resume intent as an active trip so browser/PWA restarts can offer the
     same route again. */
  GoApp.prototype.saveTrip = function () {
    if(this.addressEditing&&!this.state.navigating)return;
    if(!this.state.destination||!this.state.routes.length)return;
    var data={savedAt:Date.now(),destination:this.state.destination,destinationQuery:this.state.destinationQuery,origin:this.state.origin,routes:this.state.routes,routeIndex:this.state.routeIndex,travelMode:this.state.travelMode,navigating:!!(this.state.navigating||this.state.resumeTrip),remainingDistance:this.state.remainingDistance,remainingDuration:this.state.remainingDuration};
    try{localStorage.setItem('go-app-active-trip',JSON.stringify(data));}catch(_){}
  };

  /* A firm pause invalidates every previous stream attempt and clears the media
     source, preventing delayed reconnect timers from starting playback again. */
  GoApp.prototype.pausePlayer = function () {
    this.playerWanted=false;
    clearTimeout(this.audioTimer);clearTimeout(this.reconnectTimer);
    this.streamAttempt+=1;this.failedStreamAttempt=-1;this.reconnectAttempt=0;
    if(this.audio){try{this.audio.pause();if(this.audioKind==='radio'){this.audio.removeAttribute('src');this.audio.load();}}catch(_){}}
    this.setPlayerState({status:'paused',playing:false,detail:''});
  };

  GoApp.prototype.spotifyRedirectUri = function () {
    var config=this.state.spotifyConfig||{};
    return String(config.redirectUri||'').trim()||(location.origin+location.pathname);
  };

  GoApp.prototype.startSpotifyConnect = function () {
    var self=this,config=this.state.spotifyConfig||{};
    if(!this.state.user){this.setState({modal:'auth',authMode:'login'});return;}
    if(!config.enabled||!config.clientId){this.showToast(this.t('spotifySetupRequired'),true);return;}
    if(!window.crypto||!crypto.getRandomValues||!crypto.subtle){this.showToast('Spotify sign-in is not supported by this browser.',true);return;}
    var verifierBytes=new Uint8Array(64);crypto.getRandomValues(verifierBytes);var verifier=goBase64Url(verifierBytes);
    var stateBytes=new Uint8Array(18);crypto.getRandomValues(stateBytes);var oauthState=goBase64Url(stateBytes);
    crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)).then(function(buffer){
      var challenge=goBase64Url(new Uint8Array(buffer)),redirectUri=self.spotifyRedirectUri();
      sessionStorage.setItem('go-app-spotify-verifier',verifier);sessionStorage.setItem('go-app-spotify-redirect',redirectUri);sessionStorage.setItem('go-app-spotify-state',oauthState);
      var url=new URL('https://accounts.spotify.com/authorize');
      url.searchParams.set('client_id',config.clientId);url.searchParams.set('response_type','code');url.searchParams.set('redirect_uri',redirectUri);
      url.searchParams.set('scope','user-read-playback-state user-modify-playback-state user-read-currently-playing');url.searchParams.set('code_challenge_method','S256');url.searchParams.set('code_challenge',challenge);url.searchParams.set('state',oauthState);url.searchParams.set('show_dialog','true');
      location.href=url.toString();
    }).catch(function(error){self.showToast(error.message,true);});
  };

  GoApp.prototype.handleSpotifyCallback = function () {
    var self=this,params=new URLSearchParams(location.search),code=params.get('code'),error=params.get('error');
    var verifier=sessionStorage.getItem('go-app-spotify-verifier'),expectedState=sessionStorage.getItem('go-app-spotify-state'),returnedState=params.get('state');
    function cleanUrl(){var clean=new URL(location.href);['code','state','error','error_description'].forEach(function(key){clean.searchParams.delete(key);});history.replaceState({},'',clean.pathname+(clean.search?'?'+clean.searchParams.toString():'')+clean.hash);}
    if(error){cleanUrl();this.showToast(params.get('error_description')||error,true);return;}
    if(!code){if(this.state.user)this.loadSpotifyStatus();return;}
    if(!verifier||!expectedState||returnedState!==expectedState){cleanUrl();this.showToast('Spotify sign-in could not be verified. Please try again.',true);return;}
    var redirectUri=sessionStorage.getItem('go-app-spotify-redirect')||this.spotifyRedirectUri();
    this.api('spotify_exchange',{method:'POST',body:{code:code,verifier:verifier,redirectUri:redirectUri}}).then(function(){
      ['go-app-spotify-verifier','go-app-spotify-redirect','go-app-spotify-state'].forEach(function(key){sessionStorage.removeItem(key);});cleanUrl();
      self.setState({view:'radio',mediaTab:'spotify'});self.loadSpotifyStatus();self.showToast('Spotify connected.');
    }).catch(function(exchangeError){cleanUrl();self.showToast(exchangeError.message,true);});
  };

  GoApp.prototype.loadSpotifyStatus = function () {
    var self=this;
    if(!this.state.user)return;
    if(!this.state.spotifyConfig||!this.state.spotifyConfig.enabled){this.setState({spotifyStatus:{connected:false,playback:null},spotifyLoading:false});return;}
    this.setState({spotifyLoading:true});
    this.api('spotify_status').then(function(data){self.setState({spotifyLoading:false,spotifyStatus:data});}).catch(function(error){self.setState({spotifyLoading:false});self.showToast(error.message,true);});
  };

  GoApp.prototype.renderSpotifyPanel = function () {
    var self=this,user=this.state.user,config=this.state.spotifyConfig||{},status=this.state.spotifyStatus,playback=status&&status.playback,item=playback&&playback.item;
    if(!user)return h('section',{className:'panel spotify-panel'},h('div',{className:'spotify-logo'},'♫'),h('h2',null,'Spotify'),h('p',null,this.t('signIn')),h('button',{className:'btn primary',type:'button',onClick:function(){self.setState({modal:'auth',authMode:'login'});}},this.t('signIn')));
    if(!config.enabled||!config.clientId)return h('section',{className:'panel spotify-panel spotify-setup'},h('div',{className:'spotify-logo'},'♫'),h('h2',null,'Spotify'),h('p',null,this.t('spotifySetupRequired')),h('label',{className:'spotify-redirect-label'},h('span',null,this.t('spotifyRedirectUrl')),h('code',null,this.spotifyRedirectUri())));
    if(this.state.spotifyLoading)return h('section',{className:'panel spotify-panel'},h('div',{className:'spinner'}),h('p',null,this.t('loading')));
    if(!status||!status.connected)return h('section',{className:'panel spotify-panel'},h('div',{className:'spotify-logo'},'♫'),h('h2',null,this.t('connectSpotify')),h('p',null,this.t('spotifyConnectHelp')),h('button',{className:'btn spotify',type:'button',onClick:this.startSpotifyConnect},this.t('connectSpotify')));
    return h('section',{className:'panel spotify-panel'},h('span',{className:'eyebrow'},'Spotify'),item?h('div',{className:'spotify-now'},item.album&&item.album.images&&item.album.images[0]?h('img',{src:item.album.images[0].url,alt:''}):null,h('div',null,h('h2',null,item.name),h('p',null,(item.artists||[]).map(function(a){return a.name;}).join(', ')))):h('p',null,'Open Spotify on an active device.'),h('div',{className:'spotify-controls'},h('button',{type:'button',onClick:function(){self.spotifyControl('previous');}},'‹‹'),h('button',{type:'button',className:'primary',onClick:function(){self.spotifyControl(playback&&playback.is_playing?'pause':'play');}},playback&&playback.is_playing?'Ⅱ':'▶'),h('button',{type:'button',onClick:function(){self.spotifyControl('next');}},'››')),h('button',{type:'button',className:'btn ghost small',onClick:this.disconnectSpotify},this.t('disconnectSpotify')));
  };

  /* Smooth GPS noise before route progress and camera tracking. At rest the
     dot uses a stronger dead zone; at driving speed it catches up quickly. */
  var go2612HandlePosition = GoApp.prototype.handlePosition;
  GoApp.prototype.handlePosition = function (position) {
    if(!position||!position.coords)return go2612HandlePosition.call(this,position);
    var timestamp=Number(position.timestamp||Date.now()),raw={lat:Number(position.coords.latitude),lon:Number(position.coords.longitude)},previous=this.smoothedPosition;
    if(!isFinite(raw.lat)||!isFinite(raw.lon))return;
    if(previous&&timestamp<Number(previous.timestamp||0)-250)return;
    var dt=previous?clamp((timestamp-Number(previous.timestamp||timestamp-1000))/1000,.2,5):1;
    var distance=previous?haversine(previous,raw):Infinity,reportedSpeed=position.coords.speed==null?NaN:Number(position.coords.speed),derivedSpeed=previous&&isFinite(distance)?distance/dt:0;
    var speed=isFinite(reportedSpeed)&&reportedSpeed>=0?reportedSpeed:Math.min(45,Math.max(0,derivedSpeed)),accuracy=Math.max(0,Number(position.coords.accuracy||0));
    var alpha=speed>12?.86:(speed>5?.74:(speed>1.5?.48:.16));
    if(accuracy>35)alpha*=.68;if(accuracy>80)alpha*=.55;
    if(previous&&speed<1.2&&distance<Math.max(1.4,accuracy*.1))alpha=Math.min(alpha,.08);
    var plausible=Math.max(55,(Math.min(40,speed)+7)*dt*2.6+accuracy*1.25);
    if(previous&&distance>plausible&&accuracy>25)alpha=Math.min(alpha,.08);
    if(!previous)alpha=1;else if(distance>450&&accuracy<28)alpha=1;
    alpha=clamp(alpha,.05,1);
    var smooth={lat:previous?previous.lat+(raw.lat-previous.lat)*alpha:raw.lat,lon:previous?previous.lon+(raw.lon-previous.lon)*alpha:raw.lon,accuracy:previous?Number(previous.accuracy||accuracy)+(accuracy-Number(previous.accuracy||accuracy))*Math.min(.45,alpha):accuracy,timestamp:timestamp};
    this.smoothedPosition=smooth;
    var synthetic={coords:{latitude:smooth.lat,longitude:smooth.lon,accuracy:smooth.accuracy,speed:speed,heading:position.coords.heading,altitude:position.coords.altitude,altitudeAccuracy:position.coords.altitudeAccuracy},timestamp:timestamp};
    return go2612HandlePosition.call(this,synthetic);
  };

  GoApp.prototype.resetAfterArrival = function (nextModal) {
    this.arrivalNotified=false;
    try{localStorage.removeItem('go-app-active-trip');}catch(_){}
    var self=this,point=this.state.position||this.state.origin;
    this.setState({modal:nextModal||null,navigating:false,resumeTrip:false,routes:[],routeIndex:0,routing:false,destination:null,destinationQuery:'',suggestions:[],remainingDistance:null,remainingDuration:null,currentStep:null,activeAlert:null,speedLimit:null,speedOver:false,speedLimitLive:false,view:'map'},function(){
      self.saveNavigationCache();self.initMapSoon();
      setTimeout(function(){if(self.map&&point)self.map.setView(point,16);var input=document.querySelector('.destination-input');if(!nextModal&&input){try{input.focus({preventScroll:true});}catch(_){input.focus();}}},120);
    });
  };

  GoApp.prototype.notifyArrival = function () {
    if(this.arrivalNotified)return;
    this.arrivalNotified=true;
    var title=this.t('arrivalTitle'),destination=this.state.destination&&(this.state.destination.title||this.state.destination.label),body=destination?this.t('arrivalBody')+' '+destination:this.t('arrivalBody');
    if(this.watchId!=null){navigator.geolocation.clearWatch(this.watchId);this.watchId=null;}
    try{localStorage.removeItem('go-app-active-trip');}catch(_){}
    this.setState({navigating:false,resumeTrip:false,wakeLock:false,rerouting:false,modal:'arrival'});
    if(navigator.vibrate){try{navigator.vibrate([180,90,180]);}catch(_){}}
    if('Notification' in window&&Notification.permission==='granted'){
      var options={body:body,icon:'assets/icons/icon-192.png',badge:'assets/icons/icon-192.png',tag:'go-app-arrival',renotify:false};
      if(this.state.serviceWorkerReady&&'serviceWorker' in navigator)navigator.serviceWorker.ready.then(function(registration){return registration.showNotification(title,options);}).catch(function(){try{new Notification(title,options);}catch(_){}});else{try{new Notification(title,options);}catch(_){}}
    }
  };

  GoApp.prototype.renderArrivalModal = function () {
    var self=this,destination=this.state.destination&&(this.state.destination.title||this.state.destination.label);
    return h(Modal,{title:this.t('arrivalTitle'),closeLabel:this.t('close'),onClose:function(){self.resetAfterArrival(null);},className:'arrival-modal'},
      h('div',{className:'arrival-content'},h('div',{className:'arrival-check','aria-hidden':'true'},'✓'),h('p',null,destination||this.t('arrivalBody')),h('small',null,this.t('arrivalPrompt')),
        h('div',{className:'arrival-actions'},h('button',{type:'button',className:'btn secondary',onClick:function(){self.resetAfterArrival('report');}},h(AppIcon,{name:'report',size:18}),this.t('reportIssue')),h('button',{type:'button',className:'btn primary',onClick:function(){self.resetAfterArrival(null);}},h(AppIcon,{name:'search',size:18}),this.t('newSearch')))
      )
    );
  };

  var go2612RenderModal = GoApp.prototype.renderModal;
  GoApp.prototype.renderModal = function () {if(this.state.modal==='arrival')return this.renderArrivalModal();return go2612RenderModal.call(this);};

  /* Add a view class so the map can extend under the translucent mobile/side
     navigation while normal pages retain space for the tab bar. */
  GoApp.prototype.renderApp = function () {
    var viewName=this.state.view,view;
    if(viewName==='search')view=this.renderSearchView();else if(viewName==='parking')view=this.renderParkingView();else if(viewName==='radio')view=this.renderRadioView();else if(viewName==='reports')view=this.renderReportsView();else if(viewName==='profile')view=this.renderProfileView();else{viewName='map';view=this.renderMapView();}
    var showPlayer=this.state.player.station&&(viewName!=='map'||(!this.state.navigating&&!this.state.routes.length));
    return h('main',{className:'app-shell view-'+viewName+(this.state.navigating?' navigating-shell':'')},h('div',{className:'app-content'},view),showPlayer?this.renderPlayer():null,this.renderBottomNav(),this.renderModal(),this.state.toast?h('div',{className:'toast show'+(this.state.toastError?' error':'')},this.state.toast):null,this.state.loading?h('div',{className:'global-loader'},h('div',{className:'spinner'})):null);
  };


  /* go-app 2.6.14: deterministic radio state. The desired state is kept outside
     the media element, while every pause/stop invalidates older stream events. */
  GoApp.prototype.isPlayerActive = function () {
    var status = this.state.player && this.state.player.status;
    return !!(this.playerWanted || (this.state.player && this.state.player.playing) || ['connecting','buffering','reconnecting'].indexOf(status) >= 0);
  };

  GoApp.prototype.pausePlayer = function () {
    this.playerWanted = false;
    clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer);
    this.audioTimer = null; this.reconnectTimer = null;
    this.streamAttempt += 1; this.failedStreamAttempt = -1; this.reconnectAttempt = 0;
    var audio = this.audio;
    this.audio = null;
    if (audio) {
      try { audio.pause(); } catch (_) {}
      try { audio.removeAttribute('src'); audio.src = ''; audio.load(); } catch (_) {}
    }
    this.setPlayerState({status:'paused', playing:false, detail:''});
  };

  GoApp.prototype.stopPlayer = function () {
    this.playerWanted = false;
    clearTimeout(this.audioTimer); clearTimeout(this.reconnectTimer);
    this.audioTimer = null; this.reconnectTimer = null;
    this.streamAttempt += 1; this.failedStreamAttempt = -1; this.reconnectAttempt = 0;
    var audio = this.audio;
    this.audio = null;
    if (audio) {
      try { audio.pause(); } catch (_) {}
      try { audio.removeAttribute('src'); audio.src = ''; audio.load(); } catch (_) {}
    }
    if (this.localObjectUrl) { try { URL.revokeObjectURL(this.localObjectUrl); } catch (_) {} this.localObjectUrl = null; }
    this.audioKind = 'radio'; this.activeStation = null; this.playerCandidates = []; this.playerUrlIndex = 0;
    this.setState({player:{station:null,status:'paused',playing:false,detail:'',kind:'radio'}, localTrackIndex:-1});
  };

  GoApp.prototype.togglePlayer = function () {
    if (this.audioKind === 'local') {
      if (!this.audio) return;
      if (!this.audio.paused) { this.audio.pause(); this.setPlayerState({status:'paused', playing:false}); }
      else this.resumePlayer();
      return;
    }
    if (this.isPlayerActive()) this.pausePlayer();
    else this.resumePlayer();
  };


  /* go-app 2.6.14: client-first public data, persistent browser caching and
     low-resource fallbacks. Authenticated writes still always use the server. */
  var GO_CACHE_PREFIX = 'go-app-client-2.6.24:';
  var GO_CACHE_INDEX = GO_CACHE_PREFIX + 'index';
  function goHash(value) { var hash=5381,text=String(value),i; for(i=0;i<text.length;i+=1)hash=((hash<<5)+hash)^text.charCodeAt(i); return (hash>>>0).toString(36); }
  function goStableParams(action, params) {
    var copy={}, source=params||{};
    Object.keys(source).sort().forEach(function(key){var value=source[key];if(value===undefined||value===null||value==='')return;if(/^(?:lat|lon|fromLat|fromLon|toLat|toLon)$/.test(key)){var actionName=String(action||''),precision=actionName.indexOf('weather')>=0?2:(actionName.indexOf('nearby')>=0?3:5);value=Number(value).toFixed(precision);}copy[key]=String(value);});
    return JSON.stringify(copy);
  }
  function goCacheKey(action, params) { var raw=action+'|'+goStableParams(action,params);return GO_CACHE_PREFIX+action+':'+goHash(raw)+':'+raw.length; }
  function goCacheIndexRead(){try{var rows=JSON.parse(localStorage.getItem(GO_CACHE_INDEX)||'[]');return Array.isArray(rows)?rows:[];}catch(_){return [];}}
  function goRemoveOldClientCaches(){try{for(var i=localStorage.length-1;i>=0;i-=1){var key=localStorage.key(i);if(key&&key.indexOf('go-app-client-')===0&&key.indexOf(GO_CACHE_PREFIX)!==0)localStorage.removeItem(key);}}catch(_){} }
  function goCacheRead(key){try{var row=JSON.parse(localStorage.getItem(key)||'null');if(!row||!row.savedAt||!row.data)return null;return {data:row.data,age:Math.max(0,Date.now()-Number(row.savedAt))};}catch(_){return null;}}
  function goCacheWrite(key,data){
    var encoded;try{encoded=JSON.stringify({savedAt:Date.now(),data:data});}catch(_){return;}if(!encoded||encoded.length>360000)return;
    try{
      localStorage.setItem(key,encoded);
      var index=goCacheIndexRead().filter(function(item){return item&&item.key!==key&&localStorage.getItem(item.key)!==null;});
      index.push({key:key,savedAt:Date.now(),size:encoded.length});index.sort(function(a,b){return b.savedAt-a.savedAt;});
      var total=0,kept=[];index.forEach(function(item){var allow=kept.length<45&&(total+Number(item.size||0))<1400000;if(allow){kept.push(item);total+=Number(item.size||0);}else{try{localStorage.removeItem(item.key);}catch(_){}}});
      localStorage.setItem(GO_CACHE_INDEX,JSON.stringify(kept));
    }catch(error){
      var old=goCacheIndexRead().sort(function(a,b){return a.savedAt-b.savedAt;});for(var i=0;i<Math.min(12,old.length);i+=1){try{localStorage.removeItem(old[i].key);}catch(_){}}try{localStorage.setItem(key,encoded);}catch(_){}
    }
  }
  function goCachePolicy(action){
    var policies={geocode:[7*86400000,30*86400000],route:[12*3600000,3*86400000],weather:[10*60000,3*3600000],nearby:[20*60000,8*3600000],reports:[60000,10*60000],radio_stations:[24*3600000,14*86400000]};
    return policies[action]||null;
  }
  function goExternalJson(url, timeout, requestOptions) {
    requestOptions=requestOptions||{};var controller=typeof AbortController!=='undefined'?new AbortController():null,timeoutMs=Math.max(4000,Number(timeout||15000));
    var config={method:requestOptions.method||'GET',headers:Object.assign({Accept:'application/json'},requestOptions.headers||{}),cache:requestOptions.cache||'default',credentials:'omit'};
    if(requestOptions.body!==undefined)config.body=requestOptions.body;if(controller)config.signal=controller.signal;
    return new Promise(function(resolve,reject){var settled=false,timer=setTimeout(function(){if(settled)return;settled=true;if(controller)controller.abort();reject(new Error('External service request timed out.'));},timeoutMs);
      fetch(url,config).then(function(response){if(!response.ok)throw new Error('External service unavailable ('+response.status+').');return response.json();}).then(function(data){if(settled)return;settled=true;clearTimeout(timer);resolve(data);}).catch(function(error){if(settled)return;settled=true;clearTimeout(timer);reject(error);});
    });
  }
  function goCachedTask(owner,key,ttl,staleTtl,task){
    owner._clientInflight=owner._clientInflight||{};var cached=goCacheRead(key);
    if(cached&&cached.age<=ttl)return Promise.resolve(cached.data);
    if(!owner.state.online&&cached&&cached.age<=staleTtl)return Promise.resolve(cached.data);
    if(owner._clientInflight[key])return owner._clientInflight[key];
    var promise=Promise.resolve().then(task).then(function(data){goCacheWrite(key,data);return data;}).catch(function(error){if(cached&&cached.age<=staleTtl)return cached.data;throw error;});
    owner._clientInflight[key]=promise;var cleanup=function(){delete owner._clientInflight[key];};promise.then(cleanup,cleanup);return promise;
  }

  var go2613NetworkApi=GoApp.prototype.api;
  GoApp.prototype.api=function(action,options){
    options=options||{};var method=String(options.method||'GET').toUpperCase(),policy=method==='GET'&&!options.noCache?goCachePolicy(action):null;
    if(!policy)return go2613NetworkApi.call(this,action,options);
    var key=goCacheKey(action,options.params||{}),cached=goCacheRead(key),self=this;
    if(cached&&cached.age<=policy[0])return Promise.resolve(cached.data);
    if(!this.state.online&&cached&&cached.age<=policy[1])return Promise.resolve(cached.data);
    this._apiInflight=this._apiInflight||{};if(this._apiInflight[key])return this._apiInflight[key];
    var request=go2613NetworkApi.call(this,action,options).then(function(data){goCacheWrite(key,data);return data;}).catch(function(error){if(cached&&cached.age<=policy[1])return cached.data;throw error;});
    this._apiInflight[key]=request;var cleanup=function(){if(self._apiInflight)delete self._apiInflight[key];};request.then(cleanup,cleanup);return request;
  };

  function goCountryCodes(code){
    code=String(code||'ALL').toUpperCase();if(code==='EU')return EU_COUNTRIES;if(code==='BALTIC')return BALTIC_COUNTRIES;if(code==='NORDIC')return NORDIC_COUNTRIES;if(code==='ALL')return EUROPE_COUNTRIES;if(EUROPE_COUNTRIES.indexOf(code)>=0)return [code];return [];
  }
  GoApp.prototype.clientGeocode=function(query){
    var self=this,maps=this.state.maps||{},base=String(maps.nominatimUrl||'').replace(/\/$/,'');
    if(!maps.clientFirst||!base||!this.state.online)return Promise.reject(new Error('Client search unavailable.'));
    var country=String(this.state.navCountry||'ALL'),params={q:String(query||'').trim(),lang:this.state.lang,country:country},key=goCacheKey('external-geocode',params);
    return goCachedTask(this,key,7*86400000,30*86400000,function(){
      var url=new URL(base+'/search');url.searchParams.set('format','jsonv2');url.searchParams.set('q',params.q);url.searchParams.set('limit','6');url.searchParams.set('addressdetails','1');url.searchParams.set('extratags','1');url.searchParams.set('namedetails','1');url.searchParams.set('accept-language',params.lang);
      var codes=goCountryCodes(country);if(codes.length)url.searchParams.set('countrycodes',codes.join(',').toLowerCase());
      return goExternalJson(url.toString(),12000).then(function(rows){
        if(!Array.isArray(rows))throw new Error('Place provider returned invalid data.');
        var results=rows.slice(0,6).map(function(row,index){
          var address=row.address||{},extra=row.extratags||{},names=row.namedetails||{},title=safePlaceText(row.name||names.name||address.amenity||address.shop||address.tourism||address.building||String(row.display_name||'').split(',')[0]);
          var city=safePlaceText(address.city||address.town||address.village||address.municipality||address.county),road=safePlaceText(address.road||address.pedestrian||address.footway),house=safePlaceText(address.house_number),postcode=safePlaceText(address.postcode),countryName=safePlaceText(address.country);
          var shortAddress=[(road+(house?' '+house:'')).trim(),city,postcode,countryName].filter(function(value){return !!value;}).join(', ');
          return {id:String(row.place_id||('direct-'+index)),osmType:safePlaceText(row.osm_type),osmId:String(row.osm_id||''),title:title||shortAddress,label:safePlaceText(row.display_name)||shortAddress,address:shortAddress,road:road,houseNumber:house,city:city,postcode:postcode,country:countryName,countryCode:safePlaceText(address.country_code).toUpperCase(),lat:Number(row.lat),lon:Number(row.lon),class:safePlaceText(row.class||row.category),type:safePlaceText(row.type),website:safePlaceText(extra.website||extra['contact:website']),phone:safePlaceText(extra.phone||extra['contact:phone']),openingHours:safePlaceText(extra.opening_hours),wikipedia:safePlaceText(extra.wikipedia),wikidata:safePlaceText(extra.wikidata)};
        });
        return {ok:true,results:normalisePlaceResults(results),source:'client'};
      });
    });
  };
  GoApp.prototype.geocodeRequest=function(query){
    var self=this,server=function(){return self.api('geocode',{timeout:16000,params:{q:query,lang:self.state.lang,country:String(self.state.navCountry||'ALL').toLowerCase()}});};
    return this.clientGeocode(query).catch(server);
  };

  function goNormaliseRoutes(data,mode,lowPower){
    if(!data||data.code!=='Ok'||!Array.isArray(data.routes))throw new Error('No route was found.');
    return data.routes.slice(0,3).map(function(route,index){
      var raw=route&&route.geometry&&Array.isArray(route.geometry.coordinates)?route.geometry.coordinates:[],maximum=lowPower?850:1600,stride=raw.length>maximum?Math.ceil(raw.length/maximum):1,coordinates=[];
      for(var i=0;i<raw.length;i+=stride)coordinates.push([Number(raw[i][0]),Number(raw[i][1])]);if(raw.length&&((raw.length-1)%stride)!==0)coordinates.push([Number(raw[raw.length-1][0]),Number(raw[raw.length-1][1])]);
      var steps=route&&route.legs&&route.legs[0]&&Array.isArray(route.legs[0].steps)?route.legs[0].steps:[];
      return {id:'route-'+mode+'-'+index,mode:mode,distance:Number(route.distance||0),duration:Number(route.duration||0),coordinates:coordinates,steps:steps.map(function(step){var maneuver=step.maneuver||{};return {name:safePlaceText(step.name),distance:Number(step.distance||0),duration:Number(step.duration||0),type:safePlaceText(maneuver.type),modifier:safePlaceText(maneuver.modifier),location:Array.isArray(maneuver.location)?maneuver.location.map(Number):[]};})};
    }).filter(function(route){return route.coordinates.length>1;});
  }
  GoApp.prototype.clientRoute=function(origin,destination){
    var self=this,maps=this.state.maps||{},mode=this.state.travelMode||'car',routing=maps.routing||{},base=String(routing[mode]||'').replace(/\/$/,'');
    if(!maps.clientFirst||!base||!this.state.online)return Promise.reject(new Error('Client routing unavailable.'));
    var params={fromLat:origin.lat,fromLon:origin.lon,toLat:destination.lat,toLon:destination.lon,mode:mode},key=goCacheKey('external-route',params);
    return goCachedTask(this,key,12*3600000,3*86400000,function(){
      var coordinates=Number(origin.lon).toFixed(6)+','+Number(origin.lat).toFixed(6)+';'+Number(destination.lon).toFixed(6)+','+Number(destination.lat).toFixed(6);
      var url=new URL(base+'/route/v1/driving/'+coordinates);url.searchParams.set('overview','full');url.searchParams.set('geometries','geojson');url.searchParams.set('steps','true');url.searchParams.set('alternatives','true');
      return goExternalJson(url.toString(),mode==='car'?13000:18000).then(function(data){var routes=goNormaliseRoutes(data,mode,self.lowPowerMode);if(!routes.length)throw new Error(self.t('routeFailed'));return {ok:true,mode:mode,routes:routes,source:'client'};});
    });
  };
  GoApp.prototype.routeRequest=function(origin,destination){
    var self=this,params={fromLat:origin.lat,fromLon:origin.lon,toLat:destination.lat,toLon:destination.lon,mode:this.state.travelMode};
    return this.clientRoute(origin,destination).catch(function(){return self.api('route',{timeout:22000,params:params});});
  };

  GoApp.prototype.clientWeather=function(point){
    var self=this,maps=this.state.maps||{},base=String(maps.weatherUrl||'');if(!maps.clientFirst||!base||!this.state.online)return Promise.reject(new Error('Client weather unavailable.'));
    var params={lat:point.lat,lon:point.lon},key=goCacheKey('external-weather',params);
    return goCachedTask(this,key,10*60000,3*3600000,function(){
      var url=new URL(base);url.searchParams.set('latitude',Number(point.lat).toFixed(5));url.searchParams.set('longitude',Number(point.lon).toFixed(5));url.searchParams.set('current','temperature_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_speed_10m,visibility');url.searchParams.set('forecast_hours','1');url.searchParams.set('timezone','auto');
      return goExternalJson(url.toString(),10000).then(function(data){var current=data&&data.current||{},temperature=Number(current.temperature_2m||0),precipitation=Number(current.precipitation||0),snowfall=Number(current.snowfall||0),code=Number(current.weather_code||0),wind=Number(current.wind_speed_10m||0),alerts=[];
        if(temperature<=2&&(precipitation>0||snowfall>0||(code>=45&&code<=86)))alerts.push({type:'ice',level:temperature<=0?'danger':'warning'});if(snowfall>0||[71,73,75,77,85,86].indexOf(code)>=0)alerts.push({type:'snow',level:'warning'});if(wind>=60)alerts.push({type:'wind',level:wind>=80?'danger':'warning'});
        return {ok:true,weather:{temperature:temperature,apparentTemperature:Number(current.apparent_temperature||temperature),precipitation:precipitation,rain:Number(current.rain||0),snowfall:snowfall,weatherCode:code,windSpeed:wind,visibility:Number(current.visibility||0),alerts:alerts,updatedAt:new Date().toISOString()},source:'client'};
      });
    });
  };
  GoApp.prototype.weatherRequest=function(point){var self=this;return this.clientWeather(point).catch(function(){return self.api('weather',{params:{lat:point.lat,lon:point.lon}});});};

  GoApp.prototype.searchPlaces=function(query){
    var self=this;this.setState({searching:true});this.geocodeRequest(query).then(function(data){self.setState({suggestions:normalisePlaceResults(data.results),searching:false});}).catch(function(error){self.setState({searching:false,suggestions:[]});self.showToast(error.message,true);});
  };
  GoApp.prototype.handlePlaceSearch=function(event){
    if(event&&event.preventDefault)event.preventDefault();if(event&&event.stopPropagation)event.stopPropagation();var self=this,query=String(this.state.searchQuery||'').replace(/\s+/g,' ').trim();if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    if(query.length<2){this.setState({searchResults:[],searchLoading:false,searchHasRun:true,searchError:this.t('searchMinimum')||'Enter at least two characters.'});return false;}
    var requestId=++this.placeSearchSequence;this.setState({searchLoading:true,searchError:'',searchHasRun:true,selectedPlace:null});this.geocodeRequest(query).then(function(data){if(requestId!==self.placeSearchSequence)return;var results=normalisePlaceResults(data.results),warning=safePlaceText(data.warning);self.setState({searchLoading:false,searchResults:results,searchError:warning||(!results.length?self.t('noResults'):'')});}).catch(function(error){if(requestId!==self.placeSearchSequence)return;self.setState({searchLoading:false,searchResults:[],searchError:error.message||self.t('unknownError')});self.showToast(error.message||self.t('unknownError'),true);});return false;
  };

  GoApp.prototype.buildRoute=function(origin,destination,reroute){
    var self=this;if(!origin||!destination)return Promise.reject(new Error(this.t('routeFailed')));this.arrivalNotified=false;this.loadEnvironment(origin,true);this.setState({routing:!reroute,rerouting:!!reroute});
    return this.routeRequest(origin,destination).then(function(data){var routes=data.routes||[];if(!routes.length)throw new Error(self.t('routeFailed'));self.routeProgress=null;self.setState({routes:routes,routeIndex:0,routing:false,rerouting:false},function(){if(self.map){self.map.setRoute(routes[0],routes.slice(1));if(reroute){var followPoint=self.state.position||origin;if(followPoint)self.map.setView(followPoint,self.state.travelMode==='car'?16:17);}else self.map.fitCoordinates(routes[0].coordinates);}self.saveTrip();if(!reroute)self.showToast(self.t('routeReady'));});return routes[0];}).catch(function(error){self.setState({routing:false,rerouting:false});if(!reroute)self.showToast(error.message||self.t('routeFailed'),true);throw error;});
  };

  GoApp.prototype.loadEnvironment=function(point,force){
    if(!point)return Promise.resolve([]);var now=Date.now(),interval=this.lowPowerMode?240000:90000;if(!force&&now-this.lastEnvironmentLoad<interval)return Promise.resolve([]);this.lastEnvironmentLoad=now;var self=this,jobs=[];
    if(this.state.features.weather!==false)jobs.push(this.weatherRequest(point).then(function(data){self.setState({weather:data.weather||null},function(){self.updateSafetyAlert();});}).catch(function(){}));
    var kinds=[];if(this.state.travelMode==='car'){if(this.state.features.speedCameras!==false)kinds.push('camera');kinds.push('speed');}if(this.state.showNearby){if(this.state.features.fuel!==false)kinds.push('fuel');if(this.state.features.parking!==false)kinds.push('parking');}if(this.state.showServices&&this.state.features.serviceAreas!==false)kinds.push('service');if(this.state.travelMode==='walk')kinds.push('transit');kinds=unique(kinds);
    if(kinds.length)jobs.push(this.api('nearby',{params:{lat:point.lat,lon:point.lon,radius:this.state.navigating?20000:9000,kinds:kinds.join(',')}}).then(function(data){self.setState({nearby:data.items||[]},function(){self.updateSafetyAlert();});}).catch(function(){}));return Promise.all(jobs);
  };

  var go2613DidMount=GoApp.prototype.componentDidMount;
  GoApp.prototype.componentDidMount=function(){
    goRemoveOldClientCaches();
    var connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection,ua=String(navigator.userAgent||''),oldAndroid=/Android\s(?:4|5|6)(?:\.|\b)/i.test(ua),slowConnection=connection&&(/(?:^|-)2g$/.test(connection.effectiveType)||connection.saveData),reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var requestedLowPower=!!(oldAndroid||slowConnection||reduced||(navigator.deviceMemory&&navigator.deviceMemory<=3)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)),result=go2613DidMount.call(this);
    this.lowPowerMode=!!(this.lowPowerMode||requestedLowPower);document.documentElement.classList.toggle('low-performance',this.lowPowerMode);document.documentElement.classList.toggle('battery-saver',this.lowPowerMode);document.documentElement.classList.toggle('legacy-android',oldAndroid);return result;
  };

  var go2613AdvertRotation=GoApp.prototype.scheduleAdvertRotation;
  GoApp.prototype.scheduleAdvertRotation=function(){if(this.lowPowerMode){clearInterval(this.adTimer);this.adTimer=null;return;}return go2613AdvertRotation.call(this);};


  /* go-app 2.6.17: route-up navigation, quicker off-route recovery and a
     dedicated live mapped-speed refresh that does not wait for weather/POIs. */
  GoApp.prototype.applyLiveSpeedLimit = function (point) {
    var now = Date.now(), limit = Number(this.liveSpeedLimit || 0), age = now - Number(this.liveSpeedLimitAt || 0);
    var moved = this.liveSpeedLimitPoint && point ? haversine(this.liveSpeedLimitPoint, point) : Infinity;
    var retained = limit > 0 && age < 180000 && moved < 3500;
    var fresh = retained && age < 75000 && moved < 1600;
    if (!retained) {
      if (this.state.speedLimitLive) this.setState({speedLimitLive:false});
      return;
    }
    var actual = point && isFinite(point.speed) ? Math.max(0, Number(point.speed) * 3.6) : 0;
    var over = this.state.speedOver ? actual > limit + 1 : actual > limit + 3;
    if (Number(this.state.speedLimit || 0) !== limit || this.state.speedOver !== over || this.state.speedLimitLive !== fresh) {
      this.setState({speedLimit:limit, speedOver:over, speedLimitLive:fresh});
    }
  };

  GoApp.prototype.refreshLiveSpeedLimit = function (point, force) {
    if (!point || this.state.travelMode !== 'car' || !this.state.online) return;
    var now = Date.now();
    if (now < Number(this.liveSpeedRetryAfter || 0)) { this.applyLiveSpeedLimit(point); return; }
    if (this.liveSpeedRequest) { this.liveSpeedPendingPoint = {lat:point.lat,lon:point.lon,accuracy:point.accuracy,speed:point.speed,heading:point.heading,timestamp:point.timestamp}; return; }
    var moved = this.lastLiveSpeedPoint ? haversine(this.lastLiveSpeedPoint, point) : Infinity;
    var stepKey = String(this.state.currentStep && this.state.currentStep.name || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    var roadChanged = !!(stepKey && this.lastLiveSpeedStepKey && stepKey !== this.lastLiveSpeedStepKey);
    if (!force && !roadChanged && now - Number(this.lastLiveSpeedAt || 0) < 7000 && moved < 20) return;
    this.lastLiveSpeedAt = now; this.lastLiveSpeedPoint = {lat:point.lat,lon:point.lon}; this.lastLiveSpeedStepKey = stepKey;
    var self = this, requestPoint = {lat:Number(point.lat),lon:Number(point.lon)};
    var heading = isFinite(Number(point.heading)) ? Number(point.heading) : (isFinite(Number(this.navigationBearing)) ? Number(this.navigationBearing) : '');
    this.liveSpeedRequest = this.api('nearby',{noCache:true,timeout:28000,params:{lat:Number(point.lat).toFixed(6),lon:Number(point.lon).toFixed(6),heading:heading,radius:220,kinds:'speed',live:1}}).then(function(data){
      var retrySeconds = Math.max(0, Number(data.retryAfter || 0));
      self.liveSpeedRetryAfter = retrySeconds > 0 ? Date.now() + retrySeconds * 1000 : 0;
      var current = self.state.position || point;
      if (haversine(requestPoint, current) > 400) return;
      var rows = (data.items || []).filter(function(item){return item && item.type === 'speed' && Number(item.maxspeed) > 0;});
      if (!rows.length) { self.applyLiveSpeedLimit(current); return; }
      var currentHeading = isFinite(Number(current.heading)) ? Number(current.heading) : (isFinite(Number(self.navigationBearing)) ? Number(self.navigationBearing) : null);
      rows.sort(function(a,b){
        function score(item){
          var road = String(item.roadName || item.name || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), value = 0;
          if (stepKey && road && (stepKey.indexOf(road) >= 0 || road.indexOf(stepKey) >= 0)) value += 140;
          if (isFinite(currentHeading) && isFinite(Number(item.roadBearing))) {
            var delta = Math.abs(((Number(item.roadBearing) - currentHeading + 540) % 360) - 180);
            value += Math.max(0, 45 - Math.min(delta, Math.abs(180 - delta))) * .8;
          }
          if (Number(item.maxspeed) === Number(self.liveSpeedLimit || 0)) value += 12;
          value -= Math.min(60, Number(item.distance || 0) / 4);
          return value;
        }
        return score(b) - score(a);
      });
      var chosen = rows[0], limit = Number(chosen.maxspeed || 0);
      if (limit > 0) {
        var ageMs = Math.max(0, Number(data.ageSeconds || 0) * 1000);
        self.liveSpeedLimit = limit; self.liveSpeedLimitAt = Date.now() - ageMs;
        self.liveSpeedLimitPoint = {lat:Number(current.lat),lon:Number(current.lon)};
        self.liveSpeedRoad = String(chosen.roadName || chosen.name || '');
        self.applyLiveSpeedLimit(current);
      }
    }).catch(function(){ self.liveSpeedRetryAfter = Date.now() + 30000; self.applyLiveSpeedLimit(self.state.position || point); }).then(function(){
      self.liveSpeedRequest = null;
      var pending = self.liveSpeedPendingPoint; self.liveSpeedPendingPoint = null;
      if (pending && haversine(requestPoint,pending) > 25) setTimeout(function(){self.refreshLiveSpeedLimit(pending,true);},0);
    },function(){ self.liveSpeedRequest = null; });
  };

  GoApp.prototype.updateNavigationTracking = function () {
    var point = this.state.position, route = this.state.routes[this.state.routeIndex];
    if (!point || !this.map) return;
    if (!this.state.navigating || !this.state.follow) {
      if (!this.state.navigating) this.map.setBearing(0);
      return;
    }
    var nearest = route && route.coordinates ? nearestOnRoute(point, route.coordinates) : null;
    var speed = Math.max(0, Number(point.speed || 0)), accuracy = Math.max(0, Number(point.accuracy || 0)), now=Date.now();
    var lookAhead = this.state.travelMode === 'car' ? Math.max(42, Math.min(105, 38 + speed * 4.2)) : (this.state.travelMode === 'bike' ? 26 : 14);
    var routeCourse = nearest && nearest.distance < Math.max(75, accuracy * 1.6) ? routeBearingAt(route.coordinates, nearest, lookAhead) : null;
    var gpsCourse = isFinite(Number(point.heading)) && speed > 1.4 ? Number(point.heading) : null;
    var movementCourse = null, movedFromCourse=this.lastCoursePoint?haversine(this.lastCoursePoint,point):Infinity;
    if (this.lastCoursePoint && movedFromCourse > (this.state.travelMode === 'car' ? Math.max(3.5,speed*.45) : 2.5)) movementCourse = bearingBetween(this.lastCoursePoint, point);
    if (!this.lastCoursePoint || movedFromCourse > 2.5) this.lastCoursePoint = {lat:point.lat,lon:point.lon};
    var target = isFinite(routeCourse) ? routeCourse : (isFinite(gpsCourse) ? gpsCourse : movementCourse);
    if(isFinite(routeCourse)&&isFinite(gpsCourse)){
      var routeGpsDelta=Math.abs(((gpsCourse-routeCourse+540)%360)-180);
      if(routeGpsDelta<70)target=blendBearing(routeCourse,gpsCourse,.18);
    }
    if(speed<.8&&!isFinite(movementCourse))target=null;
    if (isFinite(target)) {
      if(!isFinite(this.navigationBearing))this.navigationBearing=target;
      else{
        var delta=Math.abs(((target-this.navigationBearing+540)%360)-180),dt=clamp((now-Number(this.lastNavigationBearingAt||now-800))/1000,.15,2);
        if(!(delta>105&&speed<3&&!isFinite(movementCourse))){
          var response=this.state.travelMode==='car'?clamp(.20+speed*.026,.22,.58):.28;
          var maxRate=this.state.travelMode==='car'?clamp(35+speed*7,38,135):55;
          var amount=delta>0?Math.min(response,maxRate*dt/delta):1;
          this.navigationBearing=blendBearing(this.navigationBearing,target,amount);
        }
      }
    }
    this.lastNavigationBearingAt=now;
    if (!isFinite(this.navigationBearing)) this.navigationBearing = 0;
    var displayPoint=point;
    if(nearest&&this.state.travelMode==='car'){
      var snapThreshold=Math.min(38,Math.max(18,accuracy*.9));
      if(nearest.distance<snapThreshold){
        var snap=(speed>2?0.82:0.42)*clamp(1-nearest.distance/(snapThreshold*1.35),.25,1);
        displayPoint=Object.assign({},point,{lat:point.lat+(Number(nearest.lat)-point.lat)*snap,lon:point.lon+(Number(nearest.lon)-point.lon)*snap});
      }
    }
    var zoom = this.state.travelMode === 'car' ? 16 : 17, offset = this.state.travelMode === 'car' ? .31 : (this.state.travelMode === 'bike' ? .26 : .22);
    this.map.setNavigationView(displayPoint, this.navigationBearing, zoom, offset);

    if (nearest) {
      var base = this.state.travelMode === 'car' ? 34 : (this.state.travelMode === 'bike' ? 24 : 18);
      var threshold = Math.min(base + 34, Math.max(base, accuracy * 1.15));
      if (nearest.distance > threshold) {
        if (!this.fastOffRouteSince) this.fastOffRouteSince = Date.now();
        var wait = this.state.travelMode === 'car' ? 2200 : 3000;
        if (Date.now() - this.fastOffRouteSince > wait && Date.now() - Number(this.lastRerouteAt || 0) > 8000 && !this.state.rerouting) this.rerouteFrom(point);
      } else this.fastOffRouteSince = null;
    }
    this.refreshLiveSpeedLimit(point, false);
    this.applyLiveSpeedLimit(point);
  };

  var go2617HandlePosition = GoApp.prototype.handlePosition;
  GoApp.prototype.handlePosition = function (position) {
    var result = go2617HandlePosition.call(this, position), self = this;
    clearTimeout(this.navigationTrackingTimer);
    this.navigationTrackingTimer = setTimeout(function(){ self.updateNavigationTracking(); }, 0);
    return result;
  };

  var go2617StartNavigation = GoApp.prototype.startNavigation;
  GoApp.prototype.startNavigation = function () {
    this.navigationBearing = null;
    this.fastOffRouteSince = null;
    this.lastLiveSpeedAt = 0;
    if (this.state.speedLimitLive) this.setState({speedLimitLive:false});
    this.refreshLiveSpeedLimit(this.state.position || this.state.origin, true);
    return go2617StartNavigation.call(this);
  };

  var go2617StopNavigation = GoApp.prototype.stopNavigation;
  GoApp.prototype.stopNavigation = function () {
    this.navigationBearing = null;
    this.fastOffRouteSince = null;
    this.liveSpeedLimit = null;
    this.liveSpeedLimitAt = 0;
    if (this.map) this.map.setBearing(0);
    var result = go2617StopNavigation.apply(this, arguments);
    this.setState({speedLimit:null,speedOver:false,speedLimitLive:false});
    return result;
  };

  /* go-app 2.6.20: smooth navigation, live-first speed guidance and managed road alerts. */
  (function () {
    var translations = {
      en:{recommendedSpeed:'Recommended',recommendedSpeedHint:'Advisory only - follow road signs',roadAlert:'Road alert',stillThere:'Is this still on the road?',yesStillThere:'Still there',noLongerThere:'Not there',alertDismiss:'Dismiss alert',myRoadAlerts:'My road alerts',noMyRoadAlerts:'You have no active road alerts.',removeAlert:'Remove',alertRemoved:'Road alert removed.',alertConfirmed:'Thanks. The alert was updated.',liveSpeed:'Live road data',reportStatusActive:'Active'},
      lv:{recommendedSpeed:'Ieteicamais',recommendedSpeedHint:'Tikai ieteikums - sekojiet cela zimem',roadAlert:'Bridinajums uz cela',stillThere:'Vai tas vel ir uz cela?',yesStillThere:'Vel ir',noLongerThere:'Vairs nav',alertDismiss:'Aizvert bridinajumu',myRoadAlerts:'Mani cela bridinajumi',noMyRoadAlerts:'Jums nav aktivu cela bridinajumu.',removeAlert:'Nonemt',alertRemoved:'Cela bridinajums nonemts.',alertConfirmed:'Paldies. Bridinajums atjauninats.',liveSpeed:'Aktuali cela dati',reportStatusActive:'Aktivs'},
      ru:{recommendedSpeed:'Rekomendovannaya',recommendedSpeedHint:'Tolko rekomendatsiya - sleduyte dorozhnym znakam',roadAlert:'Dorozhnoe preduprezhdenie',stillThere:'Eto vse eshche na doroge?',yesStillThere:'Vse eshche est',noLongerThere:'Uzhe net',alertDismiss:'Zakryt preduprezhdenie',myRoadAlerts:'Moi dorozhnye preduprezhdeniya',noMyRoadAlerts:'U vas net aktivnykh preduprezhdeniy.',removeAlert:'Udalit',alertRemoved:'Preduprezhdenie udaleno.',alertConfirmed:'Spasibo. Preduprezhdenie obnovleno.',liveSpeed:'Aktualnye dannye dorogi',reportStatusActive:'Aktivno'},
      uk:{recommendedSpeed:'Rekomendovana',recommendedSpeedHint:'Lyshe porada - dotrymuites dorozhnikh znakiv',roadAlert:'Dorozhnie poperedzhennia',stillThere:'Tse shche ye na dorozi?',yesStillThere:'Shche ye',noLongerThere:'Vzhe nemaie',alertDismiss:'Zakryty poperedzhennia',myRoadAlerts:'Moi dorozhni poperedzhennia',noMyRoadAlerts:'U vas nemaie aktyvnykh poperedzhen.',removeAlert:'Vydalyty',alertRemoved:'Poperedzhennia vydaleno.',alertConfirmed:'Diakuiemo. Poperedzhennia onovleno.',liveSpeed:'Aktualni dani dorohy',reportStatusActive:'Aktyvne'}
    };
    Object.keys(translations).forEach(function (lang) {
      I18N[lang] = I18N[lang] || {};
      Object.keys(translations[lang]).forEach(function (key) { I18N[lang][key] = translations[lang][key]; });
    });

    function samePoint(a,b) {
      return a === b || (!!a && !!b && Number(a.lat) === Number(b.lat) && Number(a.lon) === Number(b.lon) && Number(a.timestamp || 0) === Number(b.timestamp || 0));
    }
    function routeVisualSignature(route) {
      var coords=route&&route.coordinates||[];if(!coords.length)return 'none';
      var picks=[0,Math.floor(coords.length*.25),Math.floor(coords.length*.5),Math.floor(coords.length*.75),coords.length-1],parts=[coords.length,Math.round(Number(route.distance||0)),Math.round(Number(route.duration||0))];
      picks.forEach(function(index){var point=coords[Math.max(0,Math.min(coords.length-1,index))]||[];parts.push(Number(point[0]||0).toFixed(5),Number(point[1]||0).toFixed(5));});
      return parts.join('|');
    }
    var originalSetRoute = TileMap.prototype.setRoute;
    TileMap.prototype.setRoute = function (route, alternatives) {
      alternatives = alternatives || [];
      var next=route||null,old=this.route||null,sameRoute=routeVisualSignature(old)===routeVisualSignature(next),sameAlternatives=this.alternatives&&this.alternatives.length===alternatives.length&&this.alternatives.every(function(item,index){return item===alternatives[index];});
      if(sameRoute&&sameAlternatives)return;
      var layers=this.ensureOverlayLayers(),reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      clearTimeout(this.routeTransitionTimer);this.routeTransitionToken=Number(this.routeTransitionToken||0)+1;var token=this.routeTransitionToken;
      if(!sameRoute&&old){this.previousRoute=old;var oldPath=this.pathFor(old.coordinates||[]);layers.routePrevious.style.display='';layers.previousRouteShadow.setAttribute('d',oldPath);layers.previousRouteLine.setAttribute('d',oldPath);layers.routePrevious.style.opacity='1';}
      if(!sameRoute&&next)layers.route.style.opacity=reduced?'1':'0';
      var result=originalSetRoute.call(this,next,alternatives),self=this;
      if(!sameRoute){
        this.scheduleRender();
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          if(self.destroyed||token!==self.routeTransitionToken)return;var active=self.ensureOverlayLayers();
          active.route.classList.remove('route-fade-in');active.routePrevious.classList.remove('route-fade-out');
          if(reduced){active.route.style.opacity='';active.routePrevious.style.opacity='';self.previousRoute=null;self.scheduleRender();return;}
          void active.root.getBoundingClientRect();active.route.style.opacity='';active.routePrevious.style.opacity='';
          if(next)active.route.classList.add('route-fade-in');if(self.previousRoute)active.routePrevious.classList.add('route-fade-out');
        });});
        this.routeTransitionTimer=setTimeout(function(){if(token!==self.routeTransitionToken)return;self.previousRoute=null;var active=self.ensureOverlayLayers();active.route.classList.remove('route-fade-in');active.routePrevious.classList.remove('route-fade-out');active.route.style.opacity='';active.routePrevious.style.opacity='';self.scheduleRender();},460);
      }
      return result;
    };
    var originalSetReports = TileMap.prototype.setReports;
    TileMap.prototype.setReports = function (reports) { reports = reports || []; if (this.reports === reports) return; return originalSetReports.call(this,reports); };
    var originalSetDestination = TileMap.prototype.setDestination;
    TileMap.prototype.setDestination = function (destination) { if (samePoint(this.destination,destination)) return; return originalSetDestination.call(this,destination); };
    var originalSetMode = TileMap.prototype.setMode;
    TileMap.prototype.setMode = function (mode) { var value=['car','bike','walk'].indexOf(mode)>=0?mode:'car'; if (this.mode===value) return; return originalSetMode.call(this,value); };
    var originalSetPoi = TileMap.prototype.setPoi;
    TileMap.prototype.setPoi = function (items) { items=Array.isArray(items)?items:[]; if (this.poi===items || (this.poi && this.poi.length===items.length && this.poi.every(function(item,index){return item===items[index] || (item&&items[index]&&String(item.id)===String(items[index].id));}))) return; return originalSetPoi.call(this,items); };
    var originalSetTileStyle = TileMap.prototype.setTileStyle;
    TileMap.prototype.setTileStyle = function (style, roadUrl) {
      var value=style==='satellite'?'satellite':'road', next=value==='satellite'?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':(roadUrl||this.options.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
      if(this.mapStyle===value&&this.tileUrl===next)return;
      return originalSetTileStyle.call(this,value,roadUrl);
    };
    var originalSetUser = TileMap.prototype.setUser;
    TileMap.prototype.setUser = function (position) {
      if (this.navigationActive && this.user && position) { this.pendingNavigationUser=position; return; }
      if (samePoint(this.user,position)) return;
      return originalSetUser.call(this,position);
    };
    var originalNavigationSetView = TileMap.prototype.setView;
    TileMap.prototype.setView = function (center, zoom) {
      /* The legacy GPS callback calls setUser() and then setView() for every fix.
         During active guidance, suppress that immediate camera/bearing snap and
         let setNavigationView() interpolate both the dot and camera together. */
      if (this.navigationActive && this.pendingNavigationUser && samePoint(center,this.pendingNavigationUser)) {
        if (isFinite(zoom)) this.zoom=clamp(Math.round(zoom),3,19);
        return;
      }
      return originalNavigationSetView.call(this,center,zoom);
    };

    function tileXY(point,zoom) {
      var n=Math.pow(2,zoom),lat=Math.max(-85.05112878,Math.min(85.05112878,Number(point.lat))),lon=Number(point.lon);
      return {x:Math.floor((lon+180)/360*n),y:Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n)};
    }
    TileMap.prototype.preloadPoints = function (points, zoom, maxTiles) {
      var self=this,template=this.tileUrl||this.options.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',seen={},jobs=[],limit=Math.max(4,Number(maxTiles||12)),now=Date.now();
      this.preloadKeys=this.preloadKeys||{};this.preloadImages=this.preloadImages||[];
      Object.keys(this.preloadKeys).forEach(function(key){if(now-Number(self.preloadKeys[key]||0)>180000)delete self.preloadKeys[key];});
      (points||[]).forEach(function(point){
        if(!point||!isFinite(point.lat)||!isFinite(point.lon)||jobs.length>=limit)return;
        var t=tileXY(point,zoom),count=Math.pow(2,zoom);
        [-1,0,1].forEach(function(dx){[-1,0,1].forEach(function(dy){
          if(jobs.length>=limit)return;var x=((t.x+dx)%count+count)%count,y=t.y+dy;if(y<0||y>=count)return;
          var key=template+'|'+zoom+':'+x+':'+y;if(seen[key]||self.preloadKeys[key])return;seen[key]=true;self.preloadKeys[key]=now;
          jobs.push(new Promise(function(resolve){
            var img=new Image(),finished=false,done=function(){if(finished)return;finished=true;img.onload=null;img.onerror=null;resolve();};
            img.onload=done;img.onerror=done;img.decoding='async';img.src=self.tileUrlFor(template,zoom,x,y);self.preloadImages.push(img);setTimeout(done,1200);
          }));
        });});
      });
      if(this.preloadImages.length>72)this.preloadImages.splice(0,this.preloadImages.length-72);
      return Promise.race([Promise.all(jobs),new Promise(function(resolve){setTimeout(resolve,650);})]);
    };
    TileMap.prototype.preloadRouteTiles = function (route,zoom) {
      var coords=route&&route.coordinates||[],points=[];
      if(coords.length){
        var samples=Math.min(14,coords.length),step=Math.max(1,Math.floor((coords.length-1)/Math.max(1,samples-1)));
        for(var i=0;i<coords.length&&points.length<samples;i+=step)points.push({lat:Number(coords[i][1]),lon:Number(coords[i][0])});
        var last=coords[coords.length-1];if(points.length&&last&&haversine(points[points.length-1],{lat:Number(last[1]),lon:Number(last[0])})>80)points.push({lat:Number(last[1]),lon:Number(last[0])});
      }
      var z=zoom||this.zoom,jobs=[this.preloadPoints(points,z,30)];if(z>4)jobs.push(this.preloadPoints(points.slice(0,8),z-1,14));return Promise.all(jobs);
    };
    TileMap.prototype.preloadNavigationTiles = function (position,zoom) {
      if(!position)return Promise.resolve();var points=[position],route=this.route,nearest=route&&route.coordinates?nearestOnRoute(position,route.coordinates):null;
      if(nearest){[220,520,1000,1800,3000].forEach(function(distance){var point=routePointAhead(route.coordinates,nearest,distance);if(point)points.push(point);});}
      else if(isFinite(this.bearing)){[300,800,1600].forEach(function(distance){var point=pointFromBearing(position,this.bearing,distance);if(point)points.push(point);},this);}
      var z=isFinite(zoom)?Math.round(zoom):this.zoom,jobs=[this.preloadPoints(points,z,24)];if(z>4)jobs.push(this.preloadPoints(points.slice(0,4),z-1,10));return Promise.all(jobs);
    };
    var originalNavigationView=TileMap.prototype.setNavigationView;
    TileMap.prototype.setNavigationView=function(position,bearing,zoom,offsetRatio){
      this.navigationActive=true;
      this.pendingNavigationUser=null;
      var now=Date.now();
      if(now-Number(this.lastNavigationPreloadAt||0)>1900){this.lastNavigationPreloadAt=now;this.preloadNavigationTiles(position,isFinite(zoom)?Math.round(zoom):this.zoom);}
      return originalNavigationView.call(this,position,bearing,zoom,offsetRatio);
    };

    function appCountry(app, point) {
      var selected=String(app.state.navCountry||'').toUpperCase();
      if(selected==='GB'||selected==='LV')return selected;
      var destination=app.state.destination||{},code=String(destination.countryCode||'').toUpperCase();
      if(code==='GB'||code==='LV')return code;
      var lat=Number(point&&point.lat),lon=Number(point&&point.lon);
      if(lat>=55.55&&lat<=58.2&&lon>=20.6&&lon<=28.5)return 'LV';
      if(lat>=49.7&&lat<=61.1&&lon>=-8.8&&lon<=2.2)return 'GB';
      return selected;
    }
    function recommendedLimit(app,point,roadContext) {
      var country=appCountry(app,point),context=roadContext&&typeof roadContext==='object'?roadContext:{roadClass:roadContext||''},road=String(context.roadClass||'').toLowerCase(),lit=String(context.lit||'').toLowerCase(),speedType=String(context.maxspeedType||context.sourceMaxspeed||'').toLowerCase(),dual=context.dualCarriageway===true||String(context.dualCarriageway||'').toLowerCase()==='yes';
      if(country==='GB'){
        if(road==='living_street'||road==='service'||road==='pedestrian')return 32;
        if(/^(motorway|motorway_link)$/.test(road))return 113;
        if(dual&&/^(trunk|trunk_link|primary|primary_link)$/.test(road))return 113;
        if(road==='residential'||lit==='yes'||/gb:(?:urban|restricted)|uk:urban/.test(speedType))return 48;
        /* A UK road outside a built-up 30 mph context normally uses the 60 mph
           single-carriageway national limit. Keep this clearly advisory when the
           road has no mapped legal maxspeed. */
        return 97;
      }
      if(country==='LV'){
        if(road==='living_street'||road==='service')return 20;
        if(road==='residential'||lit==='yes')return 50;
        if(/^(motorway|trunk)/.test(road))return 110;
        if(road)return 90;
        return 90;
      }
      if(road==='living_street'||road==='service')return 20;
      if(/^motorway/.test(road))return 110;
      if(/^(trunk|primary|secondary)/.test(road))return 90;
      return 50;
    }
    GoApp.prototype.applyLiveSpeedLimit=function(point){
      if(this.state.travelMode!=='car'){if(this.state.speedLimit!=null)this.setState({speedLimit:null,speedOver:false,speedLimitLive:false,speedLimitRecommended:false});return;}
      var now=Date.now(),limit=Number(this.liveSpeedLimit||0),age=now-Number(this.liveSpeedLimitAt||0),moved=this.liveSpeedLimitPoint&&point?haversine(this.liveSpeedLimitPoint,point):Infinity;
      var retained=limit>0&&age<180000&&moved<3500,fresh=retained&&age<75000&&moved<1600;
      if(retained){
        var actual=point&&isFinite(point.speed)?Math.max(0,Number(point.speed)*3.6):0,over=this.state.speedOver?actual>limit+1:actual>limit+3;
        if(Number(this.state.speedLimit||0)!==limit||this.state.speedOver!==over||this.state.speedLimitLive!==fresh||this.state.speedLimitRecommended)this.setState({speedLimit:limit,speedOver:over,speedLimitLive:fresh,speedLimitRecommended:false});
        return;
      }
      var context=this.liveRoadContext||null,items=this.state.nearby||[],nearest=null;
      items.forEach(function(item){if(item&&item.type==='speed'&&(!nearest||Number(item.distance||Infinity)<Number(nearest.distance||Infinity)))nearest=item;});
      if(!context&&nearest)context=nearest;
      var advised=recommendedLimit(this,point,context||this.liveRoadClass||'');
      if(Number(this.state.speedLimit||0)!==advised||!this.state.speedLimitRecommended||this.state.speedOver||this.state.speedLimitLive)this.setState({speedLimit:advised,speedOver:false,speedLimitLive:false,speedLimitRecommended:true});
    };
    GoApp.prototype.refreshLiveSpeedLimit=function(point,force){
      if(!point||this.state.travelMode!=='car'||!this.state.online){this.applyLiveSpeedLimit(point);return;}
      var now=Date.now();
      if(now<Number(this.liveSpeedRetryAfter||0)){this.applyLiveSpeedLimit(point);return;}
      if(this.liveSpeedRequest){this.liveSpeedPendingPoint={lat:point.lat,lon:point.lon,accuracy:point.accuracy,speed:point.speed,heading:point.heading,timestamp:point.timestamp};return;}
      var moved=this.lastLiveSpeedPoint?haversine(this.lastLiveSpeedPoint,point):Infinity,stepKey=String(this.state.currentStep&&this.state.currentStep.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),roadChanged=!!(stepKey&&this.lastLiveSpeedStepKey&&stepKey!==this.lastLiveSpeedStepKey);
      if(!force&&!roadChanged&&now-Number(this.lastLiveSpeedAt||0)<6500&&moved<18){this.applyLiveSpeedLimit(point);return;}
      this.lastLiveSpeedAt=now;this.lastLiveSpeedPoint={lat:point.lat,lon:point.lon};this.lastLiveSpeedStepKey=stepKey;
      var self=this,requestPoint={lat:Number(point.lat),lon:Number(point.lon)},heading=isFinite(Number(point.heading))?Number(point.heading):(isFinite(Number(this.navigationBearing))?Number(this.navigationBearing):'');
      this.liveSpeedRequest=this.api('nearby',{noCache:true,timeout:18000,params:{lat:Number(point.lat).toFixed(6),lon:Number(point.lon).toFixed(6),heading:heading,radius:280,kinds:'speed',live:1}}).then(function(data){
        var retrySeconds=Math.max(0,Number(data.retryAfter||0));self.liveSpeedRetryAfter=retrySeconds>0?Date.now()+retrySeconds*1000:0;
        var current=self.state.position||point;if(haversine(requestPoint,current)>450)return;
        var rows=(data.items||[]).filter(function(item){return item&&item.type==='speed';});
        rows.sort(function(a,b){function score(item){var road=String(item.roadName||item.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),value=0;if(stepKey&&road&&(stepKey.indexOf(road)>=0||road.indexOf(stepKey)>=0))value+=140;if(isFinite(Number(heading))&&isFinite(Number(item.roadBearing))){var delta=Math.abs(((Number(item.roadBearing)-Number(heading)+540)%360)-180);value+=Math.max(0,45-Math.min(delta,Math.abs(180-delta)))*.8;}value-=Math.min(70,Number(item.distance||0)/4);return value;}return score(b)-score(a);});
        var chosen=rows[0]||null;
        if(chosen){self.liveRoadContext=chosen;self.liveRoadClass=String(chosen.roadClass||'');self.liveRoadName=String(chosen.roadName||chosen.name||'');self.liveRoadAt=Date.now();self.liveRoadPoint={lat:Number(current.lat),lon:Number(current.lon)};}
        else if(!self.liveRoadPoint||Date.now()-Number(self.liveRoadAt||0)>300000||haversine(self.liveRoadPoint,current)>3500){self.liveRoadContext=null;self.liveRoadClass='';self.liveRoadName='';}
        var mapped=chosen?Number(chosen.maxspeed||0):0;
        if(mapped>0){var ageMs=Math.max(0,Number(data.ageSeconds||0)*1000);self.liveSpeedLimit=mapped;self.liveSpeedLimitAt=Date.now()-ageMs;self.liveSpeedLimitPoint={lat:Number(current.lat),lon:Number(current.lon)};self.liveSpeedRoad=self.liveRoadName;}
        else{self.liveSpeedLimit=null;self.liveSpeedLimitAt=0;self.liveSpeedLimitPoint=null;}
        self.applyLiveSpeedLimit(current);
      }).catch(function(){self.liveSpeedRetryAfter=Date.now()+20000;self.applyLiveSpeedLimit(self.state.position||point);}).then(function(){self.liveSpeedRequest=null;var pending=self.liveSpeedPendingPoint;self.liveSpeedPendingPoint=null;if(pending&&haversine(requestPoint,pending)>25)setTimeout(function(){self.refreshLiveSpeedLimit(pending,true);},0);},function(){self.liveSpeedRequest=null;});
    };

    var originalRouteRequest=GoApp.prototype.routeRequest;
    GoApp.prototype.routeRequest=function(origin,destination,options){
      options=options||{};if(!options.fresh)return originalRouteRequest.call(this,origin,destination);
      var self=this,maps=this.state.maps||{},mode=this.state.travelMode||'car',routing=maps.routing||{},base=String(routing[mode]||'').replace(/\/$/,'');
      function server(){return self.api('route',{noCache:true,timeout:18000,params:{fromLat:origin.lat,fromLon:origin.lon,toLat:destination.lat,toLon:destination.lon,mode:mode,fresh:1}});}
      if(!base||!this.state.online)return server();
      var coordinates=Number(origin.lon).toFixed(6)+','+Number(origin.lat).toFixed(6)+';'+Number(destination.lon).toFixed(6)+','+Number(destination.lat).toFixed(6),url=new URL(base+'/route/v1/driving/'+coordinates);
      url.searchParams.set('overview','full');url.searchParams.set('geometries','geojson');url.searchParams.set('steps','true');url.searchParams.set('alternatives','false');url.searchParams.set('goLive','1');
      return goExternalJson(url.toString(),11000,{cache:'no-store'}).then(function(data){var routes=goNormaliseRoutes(data,mode,self.lowPowerMode);if(!routes.length)throw new Error(self.t('routeFailed'));return {ok:true,mode:mode,routes:routes,source:'live-client'};}).catch(server);
    };
    GoApp.prototype.buildRoute=function(origin,destination,reroute){
      var self=this;if(!origin||!destination)return Promise.reject(new Error(this.t('routeFailed')));
      if(reroute&&this.reroutePromise)return this.reroutePromise;
      this.arrivalNotified=false;this.loadEnvironment(origin,true);this.setState({routing:!reroute,rerouting:!!reroute});
      var request=this.routeRequest(origin,destination,{fresh:!!reroute}).then(function(data){var routes=data.routes||[];if(!routes.length)throw new Error(self.t('routeFailed'));var preload=self.map&&routes[0]?self.map.preloadRouteTiles(routes[0],self.state.travelMode==='car'?16:17):Promise.resolve();return Promise.resolve(preload).then(function(){self.routeProgress=null;return new Promise(function(resolve){self.setState({routes:routes,routeIndex:0,routing:false,rerouting:false},function(){if(self.map){self.map.setRoute(routes[0],routes.slice(1));if(reroute)self.updateNavigationTracking();else self.map.fitCoordinates(routes[0].coordinates);}self.saveTrip(true);if(!reroute)self.showToast(self.t('routeReady'));resolve(routes[0]);});});});}).catch(function(error){self.setState({routing:false,rerouting:false});if(!reroute)self.showToast(error.message||self.t('routeFailed'),true);throw error;});
      if(reroute){this.reroutePromise=request;request.then(function(){self.reroutePromise=null;},function(){self.reroutePromise=null;});}
      return request;
    };

    var originalSaveTrip=GoApp.prototype.saveTrip;
    GoApp.prototype.saveTrip=function(force){var now=Date.now();if(this.state.navigating&&!force&&now-Number(this.lastTripWriteAt||0)<4000)return;this.lastTripWriteAt=now;return originalSaveTrip.call(this);};

    GoApp.prototype.loadReports=function(point){
      var self=this,position=point||this.state.position||this.state.origin,params={guestId:guestId()};if(position){params.lat=position.lat;params.lon=position.lon;}
      return this.api('reports',{noCache:true,params:params}).then(function(data){var reports=data.reports||[];self.setState({reports:reports},function(){if(self.map)self.map.setReports(reports);self.updateSafetyAlert();});return reports;}).catch(function(){return [];});
    };
    GoApp.prototype.removeRoadReport=function(id){var self=this;return this.api('report_action',{method:'POST',body:{reportId:id,command:'remove',guestId:guestId()}}).then(function(){self.setState({reports:(self.state.reports||[]).filter(function(item){return String(item.id)!==String(id);}),activeAlert:self.state.activeAlert&&String(self.state.activeAlert.reportId)===String(id)?null:self.state.activeAlert});self.showToast(self.t('alertRemoved'));}).catch(function(error){self.showToast(error.message,true);});};
    GoApp.prototype.confirmRoadReport=function(id,present){var self=this,command=present?'confirm':'not_there';return this.api('report_action',{method:'POST',body:{reportId:id,command:command,guestId:guestId()}}).then(function(data){if(data.removed||(data.report&&data.report.status==='removed')){self.setState({reports:(self.state.reports||[]).filter(function(item){return String(item.id)!==String(id);}),activeAlert:null});}else if(data.report){self.setState({reports:(self.state.reports||[]).map(function(item){return String(item.id)===String(id)?data.report:item;})},function(){self.updateSafetyAlert();});}self.showToast(self.t('alertConfirmed'));}).catch(function(error){self.showToast(error.message,true);});};
    GoApp.prototype.dismissActiveAlert=function(){var alert=this.state.activeAlert;if(alert&&alert.id){this.dismissedRoadAlerts=this.dismissedRoadAlerts||{};this.dismissedRoadAlerts[alert.id]=Date.now()+15*60000;}this.setState({activeAlert:null});};
    GoApp.prototype.isRoadAlertDismissed=function(id){this.dismissedRoadAlerts=this.dismissedRoadAlerts||{};return Number(this.dismissedRoadAlerts[id]||0)>Date.now();};
    GoApp.prototype.updateSafetyAlert=function(){
      var point=this.state.position||this.state.origin;if(!point){if(this.state.activeAlert)this.setState({activeAlert:null});return;}
      var route=this.state.routes[this.state.routeIndex],userOnRoute=route&&route.coordinates?nearestOnRoute(point,route.coordinates):null,self=this;
      function ahead(item){var direct=haversine(point,item);if(!route||!route.coordinates||!userOnRoute)return direct;var hit=nearestOnRoute({lat:Number(item.lat),lon:Number(item.lon)},route.coordinates);if(!hit||hit.distance>350)return Infinity;var delta=hit.along-userOnRoute.along;return delta>=-100?Math.max(0,delta):Infinity;}
      var nearby=(this.state.nearby||[]).map(function(item){return Object.assign({},item,{actualDistance:ahead(item)});}).filter(function(item){return isFinite(item.actualDistance);}).sort(function(a,b){return a.actualDistance-b.actualDistance;}),camera=nearby.filter(function(item){return item.type==='camera';})[0],service=this.state.showServices?nearby.filter(function(item){return item.type==='service';})[0]:null;
      var reports=(this.state.reports||[]).filter(function(item){return item&&item.status!=='removed'&&['traffic','closure','roadwork','hazard','camera','police'].indexOf(item.type)>=0&&isFinite(Number(item.lat))&&isFinite(Number(item.lon));}).map(function(item){return Object.assign({},item,{actualDistance:ahead(item)});}).filter(function(item){return isFinite(item.actualDistance)&&!self.isRoadAlertDismissed('report:'+item.id);}).sort(function(a,b){return a.actualDistance-b.actualDistance;}),traffic=reports[0],alert=null;
      if(camera&&camera.actualDistance<=2500&&!this.isRoadAlertDismissed('camera:'+camera.id)){var cameraLimit=Number(camera.maxspeed||0)||null,actualKmh=isFinite(point.speed)?point.speed*3.6:0;alert={id:'camera:'+camera.id,type:'camera',title:this.t('cameraAhead'),message:camera.name||'',distance:camera.actualDistance,limit:cameraLimit,over:!!(cameraLimit&&actualKmh>cameraLimit+2)};}
      else if(traffic&&traffic.actualDistance<=2200&&this.state.features.communityTraffic!==false){var labels={traffic:'reportTraffic',roadwork:'reportRoadwork',hazard:'reportHazard',police:'reportPolice',camera:'reportCamera',closure:'reportClosure'};alert={id:'report:'+traffic.id,type:'traffic',title:this.t(labels[traffic.type]||'roadAlert'),message:traffic.note||this.t('reportLocation'),distance:traffic.actualDistance,over:false,reportId:traffic.id,canDelete:!!traffic.canDelete,needsConfirmation:!!traffic.needsConfirmation};}
      else if(this.state.weather&&Array.isArray(this.state.weather.alerts)&&this.state.weather.alerts.length&&!this.isRoadAlertDismissed('weather:'+this.state.weather.alerts[0].type)){var w=this.state.weather.alerts[0];alert={id:'weather:'+w.type,type:'weather',title:w.type==='ice'?this.t('iceWarning'):w.type==='snow'?this.t('snowWarning'):this.t('windWarning'),message:'',distance:null,over:w.level==='danger'};}
      else if(service&&service.actualDistance<=12000&&!this.isRoadAlertDismissed('service:'+service.id))alert={id:'service:'+service.id,type:'service',title:this.t('serviceSoon')+(service.name?' - '+service.name:''),message:'',distance:service.actualDistance,over:false};
      var previous=this.state.activeAlert,signature=alert?[alert.id,Math.round(Number(alert.distance||0)/50),alert.needsConfirmation,alert.canDelete,alert.over].join(':'):'' ,oldSignature=previous?[previous.id,Math.round(Number(previous.distance||0)/50),previous.needsConfirmation,previous.canDelete,previous.over].join(':'):'';
      if(signature!==oldSignature)this.setState({activeAlert:alert});
    };

    GoApp.prototype.renderNavigationHud=function(){
      var self=this,speed=formatSpeed(this.state.position&&this.state.position.speed,this.state.units),eta=this.state.remainingDuration!=null?new Date(Date.now()+this.state.remainingDuration*1000):null,limit=this.state.speedLimit,weather=this.state.weather?weatherVisual(this.state.weather):null,recommended=!!this.state.speedLimitRecommended,limitValue=limit?(this.state.units==='mi'?Math.round(limit/1.609344):Math.round(limit)):'-';
      return h('div',{className:'navigation-layer'},h('div',{className:'navigation-hud'},h('div',{className:'instruction-card'},h('div',{className:'turn-icon'},this.turnIcon()),h('div',{className:'instruction-copy'},h('h3',null,this.state.rerouting?this.t('rerouting'):this.currentInstruction()),h('p',null,this.state.wakeLock?this.t('wakeLockOn'):this.t('wakeLockOff'))),h('div',{className:'nav-right-cluster'},weather?h('div',{className:'nav-weather-mini',title:weather.wet?this.t('rainNow'):this.t('dryNow')},h('span',null,weather.icon),h('strong',null,weather.temperature+' deg')):null,h('div',{className:'speed-pair'},h('div',{className:'speed-limit '+(recommended?'recommended ':'')+(this.state.speedOver?'over':''),title:recommended?this.t('recommendedSpeedHint'):this.t('liveSpeed')},h('strong',null,limitValue),h('small',{className:'speed-limit-label '+(this.state.speedLimitLive?'is-live':'')},h('i',{'aria-hidden':'true'}),recommended?this.t('recommendedSpeed'):this.t('allowedSpeed')))))),h('div',{className:'live-metrics'},h('div',{className:'live-metric'},h('strong',null,formatDistance(this.state.remainingDistance,this.state.lang,this.state.units)),h('span',null,this.t('remaining'))),h('div',{className:'live-metric'},h('strong',null,eta?formatTime(eta,this.state.lang):'-'),h('span',null,this.t('eta'))),h('div',{className:'live-metric speed-metric '+(this.state.speedOver?'over':'')},h('strong',{className:'speed-readout'},h('b',null,speed.value),h('small',null,speed.label)),h('span',null,this.t('speed'))))),h('div',{className:'exit-navigation','aria-label':this.t('exitNavigation')},h('button',{type:'button',className:'btn secondary small',title:this.t('exitSearch'),'aria-label':this.t('exitSearch'),onClick:function(){self.exitNavigationTo('search');}},h(AppIcon,{name:'search',size:18}),h('span',null,this.t('exitSearch'))),h('button',{type:'button',className:'btn secondary small',title:this.t('exitHome'),'aria-label':this.t('exitHome'),onClick:function(){self.exitNavigationTo('home');}},h(AppIcon,{name:'arrowLeft',size:18}),h('span',null,this.t('exitHome'))),h('button',{type:'button',className:'btn danger small',title:this.t('stopNavigation'),'aria-label':this.t('stopNavigation'),onClick:this.stopNavigation},h(AppIcon,{name:'stop',size:17}),h('span',null,this.t('stopNavigation')))));
    };
    GoApp.prototype.renderRoadAlertCard=function(){var self=this,alert=this.state.activeAlert;if(!alert||this.state.view!=='map')return null;var icon=alert.type==='camera'?'📷':alert.type==='service'?'🅂':alert.type==='weather'?'❄':'⚠';return h('aside',{className:'road-alert-card '+(alert.over?'danger':'')+' '+(alert.reportId?'community':'system'),'aria-live':'polite'},h('button',{type:'button',className:'road-alert-close','aria-label':this.t('alertDismiss'),title:this.t('alertDismiss'),onClick:function(){self.dismissActiveAlert();}},'x'),h('div',{className:'road-alert-heading'},h('span',{className:'road-alert-icon','aria-hidden':'true'},icon),h('div',null,h('small',null,this.t('roadAlert')),h('strong',null,alert.title))),alert.message?h('p',null,alert.message):null,alert.distance!=null?h('div',{className:'road-alert-distance'},formatDistance(alert.distance,this.state.lang,this.state.units)):null,alert.needsConfirmation&&alert.reportId?h('div',{className:'road-alert-confirm'},h('span',null,this.t('stillThere')),h('div',null,h('button',{type:'button',className:'btn primary small',onClick:function(){self.confirmRoadReport(alert.reportId,true);}},this.t('yesStillThere')),h('button',{type:'button',className:'btn secondary small',onClick:function(){self.confirmRoadReport(alert.reportId,false);}},this.t('noLongerThere')))):null,alert.canDelete&&alert.reportId?h('button',{type:'button',className:'road-alert-remove',onClick:function(){self.removeRoadReport(alert.reportId);}},this.t('removeAlert')):null);};

    var originalReportsView=GoApp.prototype.renderReportsView;
    GoApp.prototype.renderReportsView=function(){var self=this,labels={traffic:'reportTraffic',roadwork:'reportRoadwork',hazard:'reportHazard',police:'reportPolice',camera:'reportCamera',closure:'reportClosure'};return h('section',{className:'app-view page-view'},h('header',{className:'page-header'},h('div',null,h('span',{className:'eyebrow'},'go-app community'),h('h1',null,this.t('reportsTitle')),h('p',null,this.t('reportsSubtitle'))),h(IconButton,{icon:'+',title:this.t('addReport'),onClick:function(){self.setState({modal:'report'});}})),h('div',{className:'card-list'},this.state.reports.length?this.state.reports.map(function(report){return h('article',{className:'panel report-card managed-report-card',key:report.id},h('div',{className:'report-icon'},REPORT_ICONS[report.type]||'!'),h('div',{className:'managed-report-copy'},h('h3',null,self.t(labels[report.type]||'report')),h('p',null,report.note||self.t('reportLocation')),h('small',null,timeAgo(report.createdAt,self.t.bind(self)))),h('div',{className:'managed-report-actions'},report.needsConfirmation?h('button',{type:'button',className:'btn secondary small',onClick:function(){self.confirmRoadReport(report.id,true);}},self.t('yesStillThere')):null,report.canDelete?h('button',{type:'button',className:'btn danger small',onClick:function(){self.removeRoadReport(report.id);}},self.t('removeAlert')):null));}):h('div',{className:'panel empty-state'},h('div',{className:'empty-icon'},'OK'),this.t('noReports'))));};
    var originalProfileView=GoApp.prototype.renderProfileView;
    GoApp.prototype.renderProfileView=function(){var self=this,base=originalProfileView.call(this),mine=(this.state.reports||[]).filter(function(report){return report.canDelete;});return h('div',{className:'profile-with-alerts'},base,h('section',{className:'panel my-road-alerts'},h('div',{className:'my-road-alerts-head'},h('h3',null,this.t('myRoadAlerts')),h('span',null,String(mine.length))),mine.length?mine.map(function(report){return h('div',{className:'my-road-alert-row',key:report.id},h('span',null,(REPORT_ICONS[report.type]||'!')+' '+(report.note||self.t('reportLocation'))),h('button',{type:'button',className:'btn danger small',onClick:function(){self.removeRoadReport(report.id);}},self.t('removeAlert')));}):h('p',null,this.t('noMyRoadAlerts'))));};

    var originalRenderApp=GoApp.prototype.renderApp;
    GoApp.prototype.renderApp=function(){var base=originalRenderApp.call(this),children=React.Children.toArray(base.props.children);children.push(this.renderRoadAlertCard());return React.cloneElement(base,base.props,children);};
    var originalSetView=GoApp.prototype.setView;
    GoApp.prototype.setView=function(view){var result=originalSetView.call(this,view);if(view==='profile')this.loadReports();return result;};
    var originalHandlePosition=GoApp.prototype.handlePosition;
    GoApp.prototype.handlePosition=function(position){var result=originalHandlePosition.call(this,position),point=position&&position.coords?{lat:position.coords.latitude,lon:position.coords.longitude}:this.state.position,now=Date.now();if(this.state.navigating&&point&&now-Number(this.lastReportsLoadAt||0)>60000){this.lastReportsLoadAt=now;this.loadReports(point);}return result;};
    var originalStartNavigation=GoApp.prototype.startNavigation;
    GoApp.prototype.startNavigation=function(){if(this.map)this.map.navigationActive=true;this.dismissedRoadAlerts=this.dismissedRoadAlerts||{};this.lastReportsLoadAt=0;this.loadReports(this.state.position||this.state.origin);return originalStartNavigation.call(this);};
    var originalStopNavigation=GoApp.prototype.stopNavigation;
    GoApp.prototype.stopNavigation=function(){if(this.map){this.map.navigationActive=false;this.map.pendingNavigationUser=null;}var result=originalStopNavigation.apply(this,arguments);this.setState({speedLimit:null,speedOver:false,speedLimitLive:false,speedLimitRecommended:false});return result;};
  }());


  /* go-app 2.6.22: stable route cross-fades and offline route packages. */
  (function () {
    var OFFLINE_ROUTE_DB='go-app-offline-2.6.22',OFFLINE_ROUTE_STORE='routes',OFFLINE_ROUTE_FALLBACK='go-app-offline-route-last';

    function offlineRouteOpen(){
      if(!window.indexedDB)return Promise.reject(new Error('IndexedDB unavailable.'));
      return new Promise(function(resolve,reject){
        var request=indexedDB.open(OFFLINE_ROUTE_DB,1);
        request.onupgradeneeded=function(){var db=request.result;if(!db.objectStoreNames.contains(OFFLINE_ROUTE_STORE))db.createObjectStore(OFFLINE_ROUTE_STORE,{keyPath:'key'});};
        request.onsuccess=function(){resolve(request.result);};request.onerror=function(){reject(request.error||new Error('Offline route storage unavailable.'));};
      });
    }
    function offlineRouteList(){
      return offlineRouteOpen().then(function(db){return new Promise(function(resolve,reject){var rows=[],tx=db.transaction(OFFLINE_ROUTE_STORE,'readonly'),store=tx.objectStore(OFFLINE_ROUTE_STORE),request=store.openCursor();request.onsuccess=function(){var cursor=request.result;if(cursor){rows.push(cursor.value);cursor.continue();}else resolve(rows);};request.onerror=function(){reject(request.error||new Error('Offline route read failed.'));};tx.oncomplete=function(){try{db.close();}catch(_){}};});});
    }
    function offlineRouteKey(mode,destination){return String(mode||'car')+':'+Number(destination&&destination.lat||0).toFixed(4)+':'+Number(destination&&destination.lon||0).toFixed(4);}
    function offlineRouteFallbackRead(){try{var row=JSON.parse(localStorage.getItem(OFFLINE_ROUTE_FALLBACK)||'null');return row&&row.routes&&row.routes.length?row:null;}catch(_){return null;}}
    function offlineRouteFallbackWrite(row){try{var encoded=JSON.stringify(row);if(encoded.length<900000)localStorage.setItem(OFFLINE_ROUTE_FALLBACK,encoded);}catch(_){} }
    function offlineRouteSave(app,origin,destination,routes,source){
      if(!origin||!destination||!Array.isArray(routes)||!routes.length)return Promise.resolve(null);
      var row={key:offlineRouteKey(app.state.travelMode,destination),savedAt:Date.now(),mode:app.state.travelMode||'car',origin:{lat:Number(origin.lat),lon:Number(origin.lon)},destination:destination,routes:routes,source:String(source||'app')};
      offlineRouteFallbackWrite(row);
      return offlineRouteOpen().then(function(db){return new Promise(function(resolve){var tx=db.transaction(OFFLINE_ROUTE_STORE,'readwrite'),store=tx.objectStore(OFFLINE_ROUTE_STORE);store.put(row);tx.oncomplete=function(){try{db.close();}catch(_){}resolve(row);};tx.onerror=function(){try{db.close();}catch(_){}resolve(row);};});}).then(function(saved){
        offlineRouteList().then(function(rows){rows.sort(function(a,b){return Number(b.savedAt||0)-Number(a.savedAt||0);});rows.slice(8).forEach(function(old){offlineRouteOpen().then(function(db){var tx=db.transaction(OFFLINE_ROUTE_STORE,'readwrite');tx.objectStore(OFFLINE_ROUTE_STORE).delete(old.key);tx.oncomplete=function(){try{db.close();}catch(_){}};}).catch(function(){});});}).catch(function(){});
        return saved;
      }).catch(function(){return row;});
    }
    function offlineRouteChoose(rows,origin,destination,mode){
      var now=Date.now(),best=null,bestScore=Infinity;
      (rows||[]).forEach(function(row){if(!row||row.mode!==mode||!row.destination||!Array.isArray(row.routes)||!row.routes.length||now-Number(row.savedAt||0)>14*86400000)return;var destinationGap=haversine(destination,row.destination),originGap=origin&&row.origin?haversine(origin,row.origin):0;if(destinationGap>850||originGap>15000)return;var score=destinationGap+originGap*.12+(now-Number(row.savedAt||0))/86400000*.8;if(score<bestScore){best=row;bestScore=score;}});return best;
    }
    function offlineRouteLoad(origin,destination,mode){
      var fallback=offlineRouteFallbackRead();
      return offlineRouteList().catch(function(){return [];}).then(function(rows){if(fallback)rows.push(fallback);return offlineRouteChoose(rows,origin,destination,mode);});
    }
    function sameDestination(a,b){return !!a&&!!b&&haversine(a,b)<850;}
    function packageResult(row){return row?{ok:true,mode:row.mode,routes:row.routes,source:'offline-device-cache',offline:true,savedAt:row.savedAt}:null;}
    function routePackageSignature(route){var coords=route&&route.coordinates||[];if(!coords.length)return 'none';var first=coords[0]||[],middle=coords[Math.floor(coords.length/2)]||[],last=coords[coords.length-1]||[];return [coords.length,Math.round(Number(route.distance||0)),Number(first[0]||0).toFixed(4),Number(first[1]||0).toFixed(4),Number(middle[0]||0).toFixed(4),Number(middle[1]||0).toFixed(4),Number(last[0]||0).toFixed(4),Number(last[1]||0).toFixed(4)].join('|');}

    function routeTileXY(point,zoom){var n=Math.pow(2,zoom),lat=Math.max(-85.05112878,Math.min(85.05112878,Number(point.lat))),lon=Number(point.lon);return {x:Math.floor((lon+180)/360*n),y:Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n)};}
    TileMap.prototype.routeTileUrls=function(route,zoom){
      var coords=route&&route.coordinates||[],template=this.tileUrl||this.options.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',urls=[],seen={},self=this;
      function add(point,z,neighbours){if(!point||urls.length>=230)return;var tile=routeTileXY(point,z),count=Math.pow(2,z),offsets=neighbours?[[0,0],[1,0],[-1,0],[0,1],[0,-1]]:[[0,0]];offsets.forEach(function(offset){if(urls.length>=230)return;var x=((tile.x+offset[0])%count+count)%count,y=tile.y+offset[1];if(y<0||y>=count)return;var key=z+':'+x+':'+y;if(seen[key])return;seen[key]=true;urls.push(self.tileUrlFor(template,z,x,y));});}
      function sample(count,z,neighbours){if(!coords.length)return;for(var i=0;i<count;i+=1){var index=Math.round((coords.length-1)*(count===1?0:i/(count-1))),coord=coords[index];add({lat:Number(coord[1]),lon:Number(coord[0])},z,neighbours);}}
      var z=Math.max(3,Math.min(19,Math.round(zoom||this.zoom)));sample(34,z,true);if(z>4)sample(22,z-1,false);return urls;
    };
    TileMap.prototype.cacheRouteCorridor=function(route,zoom){
      var urls=this.routeTileUrls(route,zoom);if(!urls.length)return Promise.resolve();
      function post(worker){try{worker.postMessage({type:'CACHE_ROUTE_TILES',urls:urls});return true;}catch(_){return false;}}
      if(navigator.serviceWorker){if(navigator.serviceWorker.controller&&post(navigator.serviceWorker.controller))return Promise.resolve();return navigator.serviceWorker.ready.then(function(registration){post(registration.active||registration.waiting);}).catch(function(){});}
      urls.slice(0,48).forEach(function(url){var image=new Image();image.decoding='async';image.src=url;});return Promise.resolve();
    };

    GoApp.prototype.prepareOfflineRoute=function(origin,destination,routes,source){
      var route=routes&&routes[0];if(!origin||!destination||!route)return Promise.resolve();
      var self=this,save=offlineRouteSave(this,origin,destination,routes,source);
      if(this.map){this.map.cacheRouteCorridor(route,this.state.travelMode==='car'?16:17);this.map.preloadRouteTiles(route,this.state.travelMode==='car'?16:17);}
      return save.then(function(){self.offlineRoutePreparedAt=Date.now();});
    };

    var go2622NetworkRouteRequest=GoApp.prototype.routeRequest;
    GoApp.prototype.routeRequest=function(origin,destination,options){
      options=options||{};var self=this,mode=this.state.travelMode||'car',activeRoutes=this.state.routes||[],activeDestination=this.state.destination;
      function activeResult(){return activeRoutes.length&&sameDestination(activeDestination,destination)?{ok:true,mode:mode,routes:activeRoutes,source:'offline-active-route',offline:true}:null;}
      function loadFallback(error){return offlineRouteLoad(origin,destination,mode).then(function(row){var result=packageResult(row)||activeResult();if(result)return result;throw error;});}
      if(!this.state.online){var current=activeResult();if(current)return Promise.resolve(current);return offlineRouteLoad(origin,destination,mode).then(function(row){var result=packageResult(row);if(result)return result;return go2622NetworkRouteRequest.call(self,origin,destination,options);});}
      return go2622NetworkRouteRequest.call(this,origin,destination,options).then(function(data){if(data&&data.routes&&data.routes.length)offlineRouteSave(self,origin,destination,data.routes,data.source);return data;}).catch(loadFallback);
    };

    var go2622BuildRoute=GoApp.prototype.buildRoute;
    GoApp.prototype.buildRoute=function(origin,destination,reroute){var self=this;return go2622BuildRoute.call(this,origin,destination,reroute).then(function(route){self.prepareOfflineRoute(origin,destination,self.state.routes,(reroute?'reroute':'route-ready'));return route;});};
    var go2622StartNavigation=GoApp.prototype.startNavigation;
    GoApp.prototype.startNavigation=function(){this.prepareOfflineRoute(this.state.position||this.state.origin,this.state.destination,this.state.routes,'navigation-start');return go2622StartNavigation.apply(this,arguments);};

    GoApp.prototype.refreshOfflineRouteOnReconnect=function(){
      if(!this.state.online||!this.state.destination||!this.state.routes.length||this._routeReconnectPromise)return Promise.resolve();
      var now=Date.now();if(now-Number(this._routeReconnectAt||0)<90000)return Promise.resolve();this._routeReconnectAt=now;
      var self=this,origin=this.state.position||this.state.origin,destination=this.state.destination;if(!origin)return Promise.resolve();
      this._routeReconnectPromise=go2622NetworkRouteRequest.call(this,origin,destination,{fresh:true,background:true}).then(function(data){
        var routes=data&&data.routes||[];if(!routes.length)return null;return self.prepareOfflineRoute(origin,destination,routes,'reconnect-refresh').then(function(){
          if(!self.state.online||!sameDestination(self.state.destination,destination))return routes[0];
          var current=self.state.routes[self.state.routeIndex],next=routes[0];if(routePackageSignature(current)===routePackageSignature(next))return next;
          return new Promise(function(resolve){self.setState({routes:routes,routeIndex:0,rerouting:false,remainingDistance:self.state.navigating?next.distance:self.state.remainingDistance,remainingDuration:self.state.navigating?next.duration:self.state.remainingDuration},function(){if(self.map){self.map.setRoute(next,routes.slice(1));if(self.state.navigating)self.updateNavigationTracking();}self.saveTrip(true);resolve(next);});});
        });
      }).catch(function(){return null;});
      var cleanup=function(){self._routeReconnectPromise=null;};this._routeReconnectPromise.then(cleanup,cleanup);return this._routeReconnectPromise;
    };

    var go2622DidMount=GoApp.prototype.componentDidMount;
    GoApp.prototype.componentDidMount=function(){
      var self=this,result=go2622DidMount.call(this);this.offlineRouteOnlineHandler=function(){setTimeout(function(){self.refreshOfflineRouteOnReconnect();},700);};window.addEventListener('online',this.offlineRouteOnlineHandler);setTimeout(function(){self.refreshOfflineRouteOnReconnect();},3500);return result;
    };
    var go2622WillUnmount=GoApp.prototype.componentWillUnmount;
    GoApp.prototype.componentWillUnmount=function(){if(this.offlineRouteOnlineHandler)window.removeEventListener('online',this.offlineRouteOnlineHandler);return go2622WillUnmount.call(this);};
  }());


  /* go-app 2.6.23: GPS quality gates plus optional National Highways and
     TomTom traffic intelligence. Dynamic legal limits are never inferred from
     traffic flow, and cached temporary limits expire after 90 seconds. */
  (function () {
    var ROAD_INTEL_CACHE='go-app-road-intelligence-2.6.23';

    function readRoadIntelCache(){
      try{var row=JSON.parse(localStorage.getItem(ROAD_INTEL_CACHE)||'null');return row&&row.data&&row.savedAt?row:null;}catch(_){return null;}
    }
    function writeRoadIntelCache(data){
      try{localStorage.setItem(ROAD_INTEL_CACHE,JSON.stringify({savedAt:Date.now(),data:data}));}catch(_){}
    }
    function gpsQuality(point){
      var accuracy=Math.max(0,Number(point&&point.accuracy||9999));
      if(accuracy<=18)return {key:'excellent',label:'GPS '+Math.round(accuracy)+' m'};
      if(accuracy<=45)return {key:'good',label:'GPS '+Math.round(accuracy)+' m'};
      if(accuracy<=90)return {key:'fair',label:'GPS ±'+Math.round(accuracy)+' m'};
      return {key:'poor',label:'GPS weak ±'+Math.round(accuracy)+' m'};
    }
    function roadIntelQueryPoint(app,point){
      if(!point)return null;
      var route=app.state.routes[app.state.routeIndex],nearest=route&&route.coordinates?nearestOnRoute(point,route.coordinates):null;
      var accuracy=Math.max(0,Number(point.accuracy||0)),threshold=Math.max(45,Math.min(140,accuracy*1.4));
      if(nearest&&nearest.distance<=threshold)return {lat:nearest.lat,lon:nearest.lon,accuracy:accuracy,speed:point.speed,heading:point.heading,timestamp:point.timestamp,snapped:true,snapDistance:nearest.distance};
      return {lat:Number(point.lat),lon:Number(point.lon),accuracy:accuracy,speed:point.speed,heading:point.heading,timestamp:point.timestamp,snapped:false};
    }
    function normalRoad(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
    function routeAhead(app,item,point){
      if(!item)return Infinity;
      var direct=isFinite(Number(item.distance))?Number(item.distance):(isFinite(Number(item.lat))&&isFinite(Number(item.lon))?haversine(point,{lat:Number(item.lat),lon:Number(item.lon)}):Infinity);
      var route=app.state.routes[app.state.routeIndex];
      if(!route||!route.coordinates||!isFinite(Number(item.lat))||!isFinite(Number(item.lon)))return direct;
      var user=nearestOnRoute(point,route.coordinates),hit=nearestOnRoute({lat:Number(item.lat),lon:Number(item.lon)},route.coordinates);
      if(!user||!hit||hit.distance>Math.max(240,Number(point.accuracy||0)*2.2))return Infinity;
      var delta=hit.along-user.along;
      return delta>=-180?Math.max(0,delta):Infinity;
    }
    function managedCandidate(app,data,point){
      var now=Date.now(),rows=(data&&data.speedManaged||[]).filter(function(item){
        var providerAge=Math.max(0,Number(item&&item.providerAgeSeconds||0)),clientAge=item&&item.clientReceivedAt?Math.max(0,(now-Number(item.clientReceivedAt))/1000):0,maxAge=Number(item&&item.maxAgeSeconds||data.maxLiveAgeSeconds||90);
        return item&&item.legal!==false&&Number(item.limitKmh)>0&&Math.max(providerAge,clientAge)<=maxAge;
      });
      if(!rows.length)return null;
      var stepRoad=normalRoad(app.state.currentStep&&app.state.currentStep.name||app.liveRoadName||''),best=null,bestScore=-Infinity;
      rows.forEach(function(item){
        var ahead=routeAhead(app,item,point),road=normalRoad(item.roadName),direct=isFinite(Number(item.distance))?Number(item.distance):haversine(point,item);
        if(!isFinite(ahead)||ahead>6500||direct>5000)return;
        var score=220-Math.min(180,ahead/25)-Math.min(70,direct/55);
        if(item.temporary)score+=250;
        else if(item.source==='national-highways-static')score+=80;
        if(stepRoad&&road&&(stepRoad.indexOf(road)>=0||road.indexOf(stepRoad)>=0))score+=180;
        if(ahead<=1400)score+=70;
        if(!road&&ahead>1800)score-=120;
        if(score>bestScore){bestScore=score;best=Object.assign({},item,{aheadDistance:Math.round(ahead),directDistance:Math.round(direct)});}
      });
      return best;
    }
    function managedKey(item){return item?String(item.id||item.roadName||'managed')+'|'+Number(item.limitKmh||0):'none';}
    function roadAlertKey(item){
      if(!item)return '';
      return [item.source||'',item.feed||'',item.id||'',item.type||'',item.title||'',isFinite(Number(item.lat))?Number(item.lat).toFixed(5):'',isFinite(Number(item.lon))?Number(item.lon).toFixed(5):''].join('|');
    }
    function appendUniqueAlerts(target,items,seen){
      (items||[]).forEach(function(item){var key=roadAlertKey(item);if(!key||seen[key])return;seen[key]=true;target.push(item);});
      return target;
    }

    GoApp.prototype.considerManagedSpeed=function(candidate,receivedAt){
      var now=Date.now(),current=this.activeManagedSpeed,key=managedKey(candidate);
      if(candidate){
        var providerAge=Math.max(0,Number(candidate.providerAgeSeconds||0)),baseReceived=Number(candidate.clientReceivedAt||receivedAt||now),effectiveSeen=baseReceived-providerAge*1000;
        candidate.receivedAt=effectiveSeen;candidate.lastSeenAt=effectiveSeen;candidate.key=key;
        if(!current||Number(candidate.limitKmh)<Number(current.limitKmh)||current.key===key||Number(candidate.limitKmh)===Number(current.limitKmh)){
          this.activeManagedSpeed=candidate;this.pendingManagedSpeed=null;this.managedMissingCount=0;return;
        }
        var pending=this.pendingManagedSpeed;
        if(!pending||pending.key!==key)pending={key:key,count:0,firstSeenAt:now,candidate:candidate};
        pending.count+=1;pending.candidate=candidate;this.pendingManagedSpeed=pending;
        if(pending.count>=2||now-pending.firstSeenAt>=8000){this.activeManagedSpeed=candidate;this.pendingManagedSpeed=null;this.managedMissingCount=0;}
        return;
      }
      this.managedMissingCount=Number(this.managedMissingCount||0)+1;
      if(current&&(this.managedMissingCount>=2||now-Number(current.lastSeenAt||current.receivedAt||0)>Number(current.maxAgeSeconds||90)*1000)){
        this.activeManagedSpeed=null;this.pendingManagedSpeed=null;
      }
    };

    GoApp.prototype.applyRoadIntelligence=function(data,receivedAt,fromCache){
      if(!data||typeof data!=='object')return;
      var now=Date.now(),received=Number(receivedAt||now),previous=this.roadIntelligence||{},incomingSources=data.sources||{},previousSources=previous.sources||{},sources=Object.assign({},previousSources,incomingSources),merged=Object.assign({},previous,data),seen={},mergedAlerts=[];
      var nhSkipped=incomingSources.nationalHighways==='skipped',flowSkipped=incomingSources.tomtomFlow==='skipped',incidentsSkipped=incomingSources.tomtomIncidents==='skipped';
      var incomingSpeeds=(data.speedManaged||[]).map(function(item){return Object.assign({},item,{clientReceivedAt:received});});
      var incomingSpeedKeys={};incomingSpeeds.forEach(function(item){incomingSpeedKeys[managedKey(item)]=true;});
      var retainedSpeeds=(previous.speedManaged||[]).filter(function(item){
        if(!item||incomingSpeedKeys[managedKey(item)]||now-Number(item.clientReceivedAt||0)>Number(item.maxAgeSeconds||90)*1000)return false;
        return item.source==='hardware-radio'||(nhSkipped&&(item.source==='national-highways'||item.source==='national-highways-static'));
      });
      merged.speedManaged=incomingSpeeds.concat(retainedSpeeds);
      if(nhSkipped)sources.nationalHighways=previousSources.nationalHighways||'skipped';
      if(flowSkipped){merged.flow=previous.flow||null;sources.tomtomFlow=previousSources.tomtomFlow||'skipped';}
      else if(data.flow)this.tomtomFlowReceivedAt=Number(receivedAt||now);
      if(incidentsSkipped)sources.tomtomIncidents=previousSources.tomtomIncidents||'skipped';
      if(flowSkipped&&incidentsSkipped)sources.tomtom=previousSources.tomtom||incomingSources.tomtom||'skipped';
      appendUniqueAlerts(mergedAlerts,(data.alerts||[]).filter(function(item){return !item.expiresAt||Number(item.expiresAt)>now;}),seen);
      if(nhSkipped)appendUniqueAlerts(mergedAlerts,(previous.alerts||[]).filter(function(item){return item&&item.source==='national-highways';}),seen);
      if(flowSkipped)appendUniqueAlerts(mergedAlerts,(previous.alerts||[]).filter(function(item){return item&&item.source==='tomtom'&&item.feed==='flow';}),seen);
      if(incidentsSkipped)appendUniqueAlerts(mergedAlerts,(previous.alerts||[]).filter(function(item){return item&&item.source==='tomtom'&&item.feed!=='flow';}),seen);
      appendUniqueAlerts(mergedAlerts,(previous.alerts||[]).filter(function(item){return item&&item.source==='hardware-radio'&&(!item.expiresAt||Number(item.expiresAt)>now);}),seen);
      merged.alerts=mergedAlerts;merged.sources=sources;
      var point=this.state.position||this.state.origin;
      this.roadIntelligence=merged;this.roadIntelligenceAt=received;
      var candidate=point?managedCandidate(this,merged,roadIntelQueryPoint(this,point)||point):null;
      this.considerManagedSpeed(candidate,receivedAt);
      var alerts=(merged.alerts||[]).map(function(item,index){
        var title=item.title||((item.type==='closure')?'Road closure ahead':(item.type==='roadwork'?'Roadworks ahead':'Traffic information ahead'));
        return Object.assign({},item,{id:item.id||('official-'+index+'-'+String(item.source||'')),title:title,official:true});
      });
      if(candidate&&Number(candidate.aheadDistance||0)>120){
        alerts.push({id:'managed-'+managedKey(candidate),type:'speed',title:'Temporary '+Math.round(Number(candidate.limitKmh)/1.609344)+' mph limit ahead',limit:Number(candidate.limitKmh),distance:Number(candidate.aheadDistance||candidate.distance||0),severity:'warning',source:'national-highways',official:true,lat:candidate.lat,lon:candidate.lon});
      }
      var patch={officialRoadAlerts:alerts,trafficFlow:merged.flow||null,roadDataSources:merged.sources||{},roadDataCached:!!fromCache};
      this.setState(patch,function(){this.applyLiveSpeedLimit(this.state.position||this.state.origin);this.updateSafetyAlert();}.bind(this));
    };

    GoApp.prototype.refreshRoadIntelligence=function(point,force){
      if(!point||this.state.travelMode!=='car'||!this.state.online)return Promise.resolve(null);
      var now=Date.now(),query=roadIntelQueryPoint(this,point)||point,poll=this.roadIntelligence&&this.roadIntelligence.pollAfterSeconds||{};
      var nhInterval=Math.max(30000,Number(poll.nationalHighways||30)*1000),flowInterval=Math.max(120000,Number(poll.tomtomFlow||180)*1000),incidentInterval=Math.max(600000,Number(poll.tomtomIncidents||1200)*1000);
      var includeFlow=!!force||now-Number(this.lastTomtomFlowAt||0)>=flowInterval,includeIncidents=!!force||now-Number(this.lastTomtomIncidentAt||0)>=incidentInterval,nhDue=!!force||now-Number(this.lastNationalHighwaysAt||0)>=nhInterval;
      if(this.roadIntelRequest){this.roadIntelPendingPoint=query;return this.roadIntelRequest;}
      if(!nhDue&&!includeFlow&&!includeIncidents)return Promise.resolve(this.roadIntelligence||null);
      if(!force&&Number(query.accuracy||0)>140&&this.roadIntelligence&&now-Number(this.roadIntelligenceAt||0)<60000)return Promise.resolve(this.roadIntelligence);
      this.lastRoadIntelAt=now;this.lastNationalHighwaysAt=now;this.lastRoadIntelPoint={lat:query.lat,lon:query.lon};
      if(includeFlow)this.lastTomtomFlowAt=now;
      if(includeIncidents)this.lastTomtomIncidentAt=now;
      var self=this;
      this.roadIntelRequest=this.api('road_intelligence',{noCache:true,timeout:19000,params:{lat:Number(query.lat).toFixed(6),lon:Number(query.lon).toFixed(6),radius:15000,tomtomFlow:includeFlow?1:0,tomtomIncidents:includeIncidents?1:0}}).then(function(data){
        writeRoadIntelCache(data);self.applyRoadIntelligence(data,Date.now(),false);return data;
      }).catch(function(){
        var cached=readRoadIntelCache();if(cached&&Date.now()-Number(cached.savedAt)<10*60000)self.applyRoadIntelligence(cached.data,cached.savedAt,true);return null;
      });
      var clean=function(){self.roadIntelRequest=null;var pending=self.roadIntelPendingPoint;self.roadIntelPendingPoint=null;if(pending&&haversine(query,pending)>100)setTimeout(function(){self.refreshRoadIntelligence(pending,false);},0);};
      this.roadIntelRequest.then(clean,clean);return this.roadIntelRequest;
    };

    var go2623ApplySpeed=GoApp.prototype.applyLiveSpeedLimit;
    GoApp.prototype.applyLiveSpeedLimit=function(point){
      var active=this.activeManagedSpeed,now=Date.now();
      if(active&&now-Number(active.lastSeenAt||active.receivedAt||0)<=Number(active.maxAgeSeconds||90)*1000&&Number(active.limitKmh)>0&&this.state.travelMode==='car'){
        var limit=Number(active.limitKmh),actual=point&&isFinite(Number(point.speed))?Math.max(0,Number(point.speed)*3.6):0,over=this.state.speedOver?actual>limit+1:actual>limit+3;
        var source=active.source==='national-highways'?'NH LIVE':(active.source==='national-highways-static'?'NH DATA':(active.source==='hardware-radio'?'RADIO LIVE':'LIVE'));
        if(Number(this.state.speedLimit||0)!==limit||this.state.speedOver!==over||!this.state.speedLimitLive||this.state.speedLimitRecommended||this.state.speedLimitSource!==source)this.setState({speedLimit:limit,speedOver:over,speedLimitLive:true,speedLimitRecommended:false,speedLimitSource:source});
        return;
      }
      var result=go2623ApplySpeed.call(this,point),self=this;
      setTimeout(function(){var source=self.state.speedLimitRecommended?'ADVISORY':(self.state.speedLimitLive?'MAP':'MAP CACHE');if(self.state.speedLimitSource!==source)self.setState({speedLimitSource:source});},0);
      return result;
    };

    var go2623UpdateSafety=GoApp.prototype.updateSafetyAlert;
    GoApp.prototype.updateSafetyAlert=function(){
      var result=go2623UpdateSafety.apply(this,arguments),point=this.state.position||this.state.origin,alerts=this.state.officialRoadAlerts||[],best=null,bestScore=-Infinity,self=this;
      if(point)alerts.forEach(function(item){var ahead=routeAhead(self,item,point);if(!isFinite(ahead))return;var danger=item.severity==='danger'||item.type==='closure',max=danger?10000:(item.type==='roadwork'?6500:3500);if(ahead>max)return;var score=(danger?1000:500)-ahead/20+(item.type==='closure'?300:0);if(score>bestScore){bestScore=score;best=Object.assign({},item,{distance:Math.round(ahead),over:false});}});
      if(best){setTimeout(function(){var current=self.state.activeAlert;if(!current||current.id!==best.id||Number(current.distance)!==Number(best.distance))self.setState({activeAlert:best});},0);}
      return result;
    };

    var go2623HandlePosition=GoApp.prototype.handlePosition;
    GoApp.prototype.handlePosition=function(position){
      if(!position||!position.coords)return go2623HandlePosition.call(this,position);
      var now=Date.now(),timestamp=Number(position.timestamp||now),accuracy=Math.max(0,Number(position.coords.accuracy||9999));
      if(now-timestamp>20000)return;
      if(accuracy>180&&this.lastReliableGpsAt&&now-this.lastReliableGpsAt<12000)return;
      this.lastGpsFixAt=now;
      if(accuracy<=90)this.lastReliableGpsAt=now;
      var result=go2623HandlePosition.call(this,position),self=this,quality=gpsQuality({accuracy:accuracy});
      if(this.gpsQualityKey!==quality.key||this.gpsQualityLabel!==quality.label){this.gpsQualityKey=quality.key;this.gpsQualityLabel=quality.label;this.setState({gpsQuality:quality});}
      clearTimeout(this.roadIntelPositionTimer);this.roadIntelPositionTimer=setTimeout(function(){var point=self.state.position||self.state.origin;if(point)self.refreshRoadIntelligence(point,false);},150);
      return result;
    };

    var go2623StartNavigation=GoApp.prototype.startNavigation;
    GoApp.prototype.startNavigation=function(){
      var result=go2623StartNavigation.apply(this,arguments),self=this;
      setTimeout(function(){var point=self.state.position||self.state.origin;if(point)self.refreshRoadIntelligence(point,true);},250);
      return result;
    };
    var go2623StopNavigation=GoApp.prototype.stopNavigation;
    GoApp.prototype.stopNavigation=function(){
      clearTimeout(this.roadIntelPositionTimer);this.activeManagedSpeed=null;this.pendingManagedSpeed=null;this.managedMissingCount=0;
      var result=go2623StopNavigation.apply(this,arguments);this.setState({officialRoadAlerts:[],trafficFlow:null,speedLimitSource:null});return result;
    };

    var go2623RenderHud=GoApp.prototype.renderNavigationHud;
    GoApp.prototype.renderNavigationHud=function(){
      var view=go2623RenderHud.call(this);if(!view)return view;
      var source=this.state.speedLimitSource||'',gps=this.state.gpsQuality||gpsQuality(this.state.position||{}),flow=this.state.trafficFlow,flowText='';
      if(flow&&isFinite(Number(flow.currentSpeedKmh))&&isFinite(Number(flow.freeFlowSpeedKmh))){var miles=this.state.units==='miles',factor=miles?0.621371:1,unit=miles?' mph':' km/h';flowText='Traffic '+Math.round(Number(flow.currentSpeedKmh)*factor)+'/'+Math.round(Number(flow.freeFlowSpeedKmh)*factor)+unit;}
      var status=h('div',{className:'road-intelligence-strip','aria-live':'polite'},source?h('span',{className:'road-source '+(source.indexOf('LIVE')>=0?'official':'')},source):null,gps?h('span',{className:'gps-quality '+String(gps.key||'')},gps.label):null,flowText?h('span',{className:'traffic-flow-label'},flowText):null);
      return React.cloneElement(view,view.props,React.Children.toArray(view.props.children).concat([status]));
    };

    GoApp.prototype.applyHardwareRoadRadio=function(detail){
      detail=detail||{};
      var now=Date.now(),age=Math.max(0,Number(detail.ageSeconds||0)),received=now-age*1000,expiresIn=Math.max(15,Math.min(300,Number(detail.expiresInSeconds||90))),expiresAt=received+expiresIn*1000;
      if(expiresAt<=now)return;
      var point=this.state.position||this.state.origin,lat=isFinite(Number(detail.lat))?Number(detail.lat):(point&&point.lat),lon=isFinite(Number(detail.lon))?Number(detail.lon):(point&&point.lon),limit=null;
      if(isFinite(Number(detail.speedLimitKmh)))limit=Math.round(Number(detail.speedLimitKmh));
      else if(isFinite(Number(detail.speedLimitMph)))limit=Math.round(Number(detail.speedLimitMph)*1.609344);
      var previous=this.roadIntelligence||{},speeds=[],alerts=[];
      if(detail.legal===true&&limit>0&&lat!=null&&lon!=null)speeds.push({id:String(detail.id||'hardware-radio'),lat:Number(lat),lon:Number(lon),limitKmh:limit,roadName:String(detail.roadName||''),source:'hardware-radio',legal:true,temporary:true,providerAgeSeconds:age,clientReceivedAt:now,maxAgeSeconds:expiresIn});
      if(detail.message||detail.title)alerts.push({id:String(detail.id||'hardware-radio-alert'),type:String(detail.type||'traffic'),title:String(detail.title||'Traffic radio information'),message:String(detail.message||''),roadName:String(detail.roadName||''),lat:lat!=null?Number(lat):null,lon:lon!=null?Number(lon):null,distance:point&&lat!=null&&lon!=null?Math.round(haversine(point,{lat:Number(lat),lon:Number(lon)})):0,severity:String(detail.severity||'warning'),source:'hardware-radio',feed:'radio',legal:false,expiresAt:expiresAt});
      this.applyRoadIntelligence({speedManaged:speeds,alerts:alerts,sources:{nationalHighways:'skipped',tomtom:'skipped',tomtomFlow:'skipped',tomtomIncidents:'skipped',hardwareRadio:String(detail.source||'native-bridge')},maxLiveAgeSeconds:90,pollAfterSeconds:previous.pollAfterSeconds||{}},now,false);
    };

    var go2623DidMount=GoApp.prototype.componentDidMount;
    GoApp.prototype.componentDidMount=function(){
      var result=go2623DidMount.call(this),self=this,cached=readRoadIntelCache();
      if(cached&&Date.now()-Number(cached.savedAt)<10*60000)setTimeout(function(){self.applyRoadIntelligence(cached.data,cached.savedAt,true);},0);
      this.roadIntelOnlineHandler=function(){var point=self.state.position||self.state.origin;if(point)setTimeout(function(){self.refreshRoadIntelligence(point,true);},500);};
      this.roadRadioHandler=function(event){self.applyHardwareRoadRadio(event&&event.detail||{});};
      this.gpsHealthTimer=setInterval(function(){
        if(!self.state.navigating)return;
        var age=Date.now()-Number(self.lastGpsFixAt||0);
        if(age>15000&&(self.state.gpsQuality&&self.state.gpsQuality.key)!=='lost')self.setState({gpsQuality:{key:'lost',label:'GPS signal lost'}});
      },5000);
      window.addEventListener('online',this.roadIntelOnlineHandler);window.addEventListener('goapp-road-radio',this.roadRadioHandler);return result;
    };
    var go2623WillUnmount=GoApp.prototype.componentWillUnmount;
    GoApp.prototype.componentWillUnmount=function(){
      clearTimeout(this.roadIntelPositionTimer);clearInterval(this.gpsHealthTimer);if(this.roadIntelOnlineHandler)window.removeEventListener('online',this.roadIntelOnlineHandler);if(this.roadRadioHandler)window.removeEventListener('goapp-road-radio',this.roadRadioHandler);return go2623WillUnmount.call(this);
    };
  }());


  /* Radio 63 1.0.0: radio-only product. */
  var RADIO63_TEXT={
    en:{go:'Open GO 63 Navigator',title:'Your radio for the road',intro:'Listen to popular Latvian, British, Ukrainian, American, Canadian and Australian stations. Add favourites for one-tap access and keep playback running with the screen off where your device supports background media.',browse:'Browse stations',favourites:'Favourites',search:'Search stations',loading:'Loading stations…',none:'No stations found.',noFav:'No favourites in this country yet. Tap ☆ beside a station to add it.',offline:'No internet. Current buffered audio may continue; Radio 63 will reconnect automatically.',addStations:'Add stations',findLive:'Find live stations',liveHelp:'Search the live directory for more stations in the selected country, then add the ones you want to Radio 63.',directoryPlaceholder:'Search live stations…',find:'Search',popular:'Popular live stations',add:'Add',added:'Added',removeFav:'Remove favourite',addFav:'Add favourite',addedToast:'Station added to Radio 63.',removeStation:'Remove station',removedToast:'Station removed from Radio 63.',searchError:'Could not search the live station directory.',countries:{LV:'Latvia',GB:'United Kingdom',UA:'Ukraine',US:'USA',CA:'Canada',AU:'Australia'}},
    lv:{go:'Atvērt GO 63 Navigator',title:'Tavs radio ceļam',intro:'Klausies populāras Latvijas, Lielbritānijas, Ukrainas, ASV, Kanādas un Austrālijas radio stacijas. Pievieno iecienītās stacijas un turpini klausīties ar izslēgtu ekrānu, ja ierīce atbalsta fona atskaņošanu.',browse:'Skatīt stacijas',favourites:'Iecienītās',search:'Meklēt stacijas',loading:'Ielādē stacijas…',none:'Stacijas nav atrastas.',noFav:'Šajā valstī vēl nav iecienīto staciju. Nospied ☆ pie stacijas, lai to pievienotu.',offline:'Nav interneta. Buferētā skaņa var turpināties; Radio 63 automātiski pieslēgsies atkārtoti.',addStations:'Pievienot stacijas',findLive:'Meklēt tiešraides stacijas',liveHelp:'Meklē dzīvajā radio katalogā papildu stacijas izvēlētajai valstij un pievieno tās Radio 63.',directoryPlaceholder:'Meklēt tiešraides stacijas…',find:'Meklēt',popular:'Populāras tiešraides stacijas',add:'Pievienot',added:'Pievienota',removeFav:'Noņemt no iecienītajām',addFav:'Pievienot iecienītajām',addedToast:'Stacija pievienota Radio 63.',removeStation:'Noņemt staciju',removedToast:'Stacija noņemta no Radio 63.',searchError:'Neizdevās meklēt tiešraides radio katalogā.',countries:{LV:'Latvija',GB:'Lielbritānija',UA:'Ukraina',US:'ASV',CA:'Kanāda',AU:'Austrālija'}},
    ru:{go:'Открыть GO 63 Navigator',title:'Ваше радио в дороге',intro:'Слушайте популярные станции Латвии, Великобритании, Украины, США, Канады и Австралии. Добавляйте избранное и продолжайте воспроизведение при выключенном экране, если устройство поддерживает фоновое аудио.',browse:'Станции',favourites:'Избранное',search:'Поиск станций',loading:'Загрузка станций…',none:'Станции не найдены.',noFav:'В этой стране пока нет избранных станций. Нажмите ☆, чтобы добавить станцию.',offline:'Нет интернета. Буфер может продолжить воспроизведение; Radio 63 переподключится автоматически.',addStations:'Добавить станции',findLive:'Найти станции в эфире',liveHelp:'Ищите дополнительные станции выбранной страны в онлайн-каталоге и добавляйте их в Radio 63.',directoryPlaceholder:'Поиск онлайн-станций…',find:'Искать',popular:'Популярные станции',add:'Добавить',added:'Добавлено',removeFav:'Удалить из избранного',addFav:'Добавить в избранное',addedToast:'Станция добавлена в Radio 63.',removeStation:'Удалить станцию',removedToast:'Станция удалена из Radio 63.',searchError:'Не удалось выполнить поиск в каталоге.',countries:{LV:'Латвия',GB:'Великобритания',UA:'Украина',US:'США',CA:'Канада',AU:'Австралия'}},
    uk:{go:'Відкрити GO 63 Navigator',title:'Ваше радіо в дорозі',intro:'Слухайте популярні станції Латвії, Великої Британії, України, США, Канади та Австралії. Додавайте улюблені станції та слухайте з вимкненим екраном, якщо пристрій підтримує фонове аудіо.',browse:'Станції',favourites:'Улюблені',search:'Пошук станцій',loading:'Завантаження станцій…',none:'Станцій не знайдено.',noFav:'У цій країні ще немає улюблених станцій. Натисніть ☆, щоб додати.',offline:'Немає інтернету. Буфер може продовжити відтворення; Radio 63 перепідключиться автоматично.',addStations:'Додати станції',findLive:'Знайти онлайн-станції',liveHelp:'Шукайте додаткові станції вибраної країни в онлайн-каталозі та додавайте їх до Radio 63.',directoryPlaceholder:'Пошук онлайн-станцій…',find:'Пошук',popular:'Популярні онлайн-станції',add:'Додати',added:'Додано',removeFav:'Видалити з улюблених',addFav:'Додати в улюблені',addedToast:'Станцію додано до Radio 63.',removeStation:'Видалити станцію',removedToast:'Станцію видалено з Radio 63.',searchError:'Не вдалося виконати пошук у каталозі.',countries:{LV:'Латвія',GB:'Велика Британія',UA:'Україна',US:'США',CA:'Канада',AU:'Австралія'}}
  };
  function radio63Text(lang,key){var d=RADIO63_TEXT[lang]||RADIO63_TEXT.en;return d[key]!==undefined?d[key]:RADIO63_TEXT.en[key];}
  function radio63Key(station) { return String(station && station.country || '') + '|' + String(station && station.id || ''); }
  function radio63ReadFavourites() {
    try { var value=JSON.parse(localStorage.getItem('radio63-favourites-v1')||'[]'); return Array.isArray(value)?value:[]; } catch (_) { return []; }
  }
  function radio63ReadAdded(){try{var value=JSON.parse(localStorage.getItem('radio63-added-stations-v1')||'[]');return Array.isArray(value)?value:[];}catch(_){return [];}}
  function radio63WriteAdded(rows){localStorage.setItem('radio63-added-stations-v1',JSON.stringify(rows.slice(-250)));}
  function radio63ReadHidden(){try{var value=JSON.parse(localStorage.getItem('radio63-hidden-stations-v1')||'[]');return Array.isArray(value)?value:[];}catch(_){return [];}}
  function radio63WriteHidden(rows){localStorage.setItem('radio63-hidden-stations-v1',JSON.stringify(rows.slice(-500)));}
  function radio63NameKey(station){var name=String(station&&station.name||'').toLowerCase().replace(/[^a-z0-9а-яёāčēģīķļņšūž]+/g,'');return String(station&&station.country||'')+'|'+name;}
  function radio63SameStation(a,b){return radio63Key(a)===radio63Key(b)||(radio63NameKey(a)!=='|'&&radio63NameKey(a)===radio63NameKey(b));}
  function radio63IsHidden(station,hidden){hidden=hidden||radio63ReadHidden();return hidden.indexOf(radio63Key(station))>=0||hidden.indexOf(radio63NameKey(station))>=0;}
  function radio63FindSame(rows,station){for(var i=0;i<(rows||[]).length;i+=1){if(radio63SameStation(rows[i],station))return rows[i];}return null;}
  function radio63CountryName(code,lang) {var d=RADIO63_TEXT[lang]||RADIO63_TEXT.en;return (d.countries&&d.countries[code])||(RADIO63_TEXT.en.countries[code])||code;}
  function radio63Flag(code) { return {LV:'🇱🇻',GB:'🇬🇧',UA:'🇺🇦',US:'🇺🇸',CA:'🇨🇦',AU:'🇦🇺'}[code]||'📻'; }

  GoApp.prototype.isRadio63Favourite = function (station) { return radio63ReadFavourites().indexOf(radio63Key(station)) >= 0; };
  GoApp.prototype.toggleRadio63Favourite = function (station) {
    var key=radio63Key(station),rows=radio63ReadFavourites(),index=rows.indexOf(key);
    if(index>=0)rows.splice(index,1);else rows.push(key);
    localStorage.setItem('radio63-favourites-v1',JSON.stringify(rows));
    this.setState({radio63FavouriteVersion:Number(this.state.radio63FavouriteVersion||0)+1});
  };
  GoApp.prototype.radio63PlayableStations = function () {
    var rows=(this.state.radioStations||[]).slice(),favourites=radio63ReadFavourites(),country=this.state.radioCountry,hidden=radio63ReadHidden();
    radio63ReadAdded().forEach(function(station){if(station&&station.country===country&&!rows.some(function(row){return radio63SameStation(row,station);})){rows.push(station);}});
    rows=rows.filter(function(station){return !radio63IsHidden(station,hidden);});
    if(this.state.radio63FavouritesOnly) rows=rows.filter(function(station){return favourites.indexOf(radio63Key(station))>=0;});
    var needle=String(this.state.radioSearch||'').trim().toLowerCase();
    if(needle) rows=rows.filter(function(station){return (String(station.name||'')+' '+String(station.tags||'')).toLowerCase().indexOf(needle)>=0;});
    return rows;
  };
  GoApp.prototype.radio63IsAdded=function(station){
    var hidden=radio63ReadHidden(),base=radio63FindSame(this.state.radioStations||[],station);
    if(base&&!radio63IsHidden(base,hidden))return true;
    return radio63ReadAdded().some(function(row){return radio63SameStation(row,station)&&!radio63IsHidden(row,hidden);});
  };
  GoApp.prototype.radio63AddStation=function(station){
    var rows=radio63ReadAdded(),hidden=radio63ReadHidden(),base=radio63FindSame(this.state.radioStations||[],station),target=base||station;
    hidden=hidden.filter(function(key){return key!==radio63Key(target)&&key!==radio63NameKey(target)&&key!==radio63Key(station)&&key!==radio63NameKey(station);});radio63WriteHidden(hidden);
    if(!base&&!rows.some(function(row){return radio63SameStation(row,station);})){rows.push(station);radio63WriteAdded(rows);}
    this.setState({radio63AddedVersion:Number(this.state.radio63AddedVersion||0)+1});this.showToast(radio63Text(this.state.lang,'addedToast'));
  };
  GoApp.prototype.radio63RemoveStation=function(station){
    var key=radio63Key(station),rows=radio63ReadAdded().filter(function(row){return radio63Key(row)!==key;}),hidden=radio63ReadHidden(),favourites=radio63ReadFavourites().filter(function(row){return row!==key;});
    radio63WriteAdded(rows);[key,radio63NameKey(station)].forEach(function(hiddenKey){if(hiddenKey&&hidden.indexOf(hiddenKey)<0)hidden.push(hiddenKey);});radio63WriteHidden(hidden);localStorage.setItem('radio63-favourites-v1',JSON.stringify(favourites));
    if(this.state.player&&this.state.player.station&&radio63SameStation(this.state.player.station,station))this.stopPlayer();
    this.setState({radio63AddedVersion:Number(this.state.radio63AddedVersion||0)+1,radio63FavouriteVersion:Number(this.state.radio63FavouriteVersion||0)+1});this.showToast(radio63Text(this.state.lang,'removedToast'));
  };
  GoApp.prototype.radio63SearchDirectory=function(){var self=this,q=String(this.state.radio63DirectoryQuery||'').trim();this.setState({radio63DirectoryLoading:true,radio63DirectoryOpen:true});this.api('radio_search',{params:{country:this.state.radioCountry,q:q}}).then(function(data){self.setState({radio63DirectoryResults:data.stations||[],radio63DirectoryLoading:false});}).catch(function(){self.setState({radio63DirectoryLoading:false});self.showToast(radio63Text(self.state.lang,'searchError'),true);});};
  GoApp.prototype.radio63Skip = function (direction) {
    var rows=this.radio63PlayableStations();
    if(!rows.length)return;
    var current=this.state.player&&this.state.player.station,index=rows.findIndex(function(station){return current&&station.id===current.id&&station.country===current.country;});
    index=index<0?0:(index+direction+rows.length)%rows.length;
    this.playStation(rows[index]);
  };

  var radio63SetupAudio=GoApp.prototype.setupAudio;
  GoApp.prototype.setupAudio=function(attempt){
    radio63SetupAudio.call(this,attempt);
    var self=this;
    if(this.audio){this.audio.preload='auto';this.audio.setAttribute('x-webkit-airplay','allow');}
    if('mediaSession' in navigator){
      try{navigator.mediaSession.setActionHandler('stop',function(){self.pausePlayer();});}catch(_){}
      try{navigator.mediaSession.setActionHandler('nexttrack',function(){self.radio63Skip(1);});}catch(_){}
      try{navigator.mediaSession.setActionHandler('previoustrack',function(){self.radio63Skip(-1);});}catch(_){}
    }
  };

  GoApp.prototype.radioFailure=function(attempt){
    var self=this,station=this.activeStation||(this.state.player&&this.state.player.station),expected=attempt==null?this.streamAttempt:attempt;
    if(!this.playerWanted||!station||expected!==this.streamAttempt)return;
    clearTimeout(this.audioTimer);clearTimeout(this.reconnectTimer);
    if(this.playerUrlIndex+1<this.playerCandidates.length){this.playerUrlIndex+=1;this.setPlayerState({status:'reconnecting',playing:false,detail:'Trying another stream'});this.reconnectTimer=setTimeout(function(){if(self.playerWanted)self.startStream();},600);return;}
    this.playerUrlIndex=0;this.reconnectAttempt+=1;
    var offline=navigator.onLine===false,delay=offline?5000:Math.min(20000,1500*Math.pow(2,Math.min(this.reconnectAttempt,4)));
    this.setPlayerState({status:'reconnecting',playing:false,detail:offline?'Offline · waiting for connection':'Reconnecting in '+Math.round(delay/1000)+'s'});
    this.reconnectTimer=setTimeout(function(){if(self.playerWanted)self.startStream();},delay);
  };

  var radio63DidMount=GoApp.prototype.componentDidMount;
  GoApp.prototype.componentDidMount=function(){
    var result=radio63DidMount.call(this),self=this;
    this.setState({view:'radio',mediaTab:'radio',radio63FavouritesOnly:localStorage.getItem('radio63-favourites-only')==='1'});
    this.radio63OnlineHandler=function(){if(self.playerWanted&&self.state.player&&self.state.player.station){clearTimeout(self.reconnectTimer);self.playerUrlIndex=0;self.reconnectAttempt=0;self.startStream();}};
    window.addEventListener('online',this.radio63OnlineHandler);
    return result;
  };
  var radio63WillUnmount=GoApp.prototype.componentWillUnmount;
  GoApp.prototype.componentWillUnmount=function(){if(this.radio63OnlineHandler)window.removeEventListener('online',this.radio63OnlineHandler);return radio63WillUnmount.call(this);};
  GoApp.prototype.setView=function(){this.setState({view:'radio'});};
  GoApp.prototype.loadSavedPlaces=function(){};
  GoApp.prototype.loadReports=function(){};
  GoApp.prototype.handleSpotifyCallback=function(){};

  /* Radio 63 1.2.6: replace inherited GO welcome page with a Radio-only home. */
  GoApp.prototype.renderWelcome=function(){
    var self=this,lang=this.state.lang||'en';
    var copy={
      en:{eyebrow:'RADIO 63',title:'Your radio for the road',text:'Listen to popular Latvian, British, Ukrainian, American, Canadian and Australian radio. Save favourite stations and keep listening with screen-off media controls where supported.',live:'Live radio',fav:'Favourite stations',background:'Background playback',open:'Open Radio 63',go:'Open GO 63 Navigator',goText:'Need navigation? Open the separate GO 63 Navigator app.',privacy:'Radio playback and favourites stay focused on listening. No navigation features are mixed into Radio 63.'},
      lv:{eyebrow:'RADIO 63',title:'Tavs radio ceļam',text:'Klausies populāras Latvijas, Lielbritānijas, Ukrainas, ASV, Kanādas un Austrālijas radio stacijas. Saglabā iecienītās stacijas un turpini klausīties ar izslēgtu ekrānu, ja ierīce atbalsta fona atskaņošanu.',live:'Tiešraides radio',fav:'Iecienītās stacijas',background:'Fona atskaņošana',open:'Atvērt Radio 63',go:'Atvērt GO 63 Navigator',goText:'Vajag navigāciju? Atver atsevišķo GO 63 Navigator lietotni.',privacy:'Radio 63 ir paredzēts radio klausīšanai un iecienītajām stacijām. Navigācijas funkcijas šeit netiek jauktas klāt.'},
      ru:{eyebrow:'RADIO 63',title:'Ваше радио в дороге',text:'Слушайте популярные станции Латвии, Великобритании, Украины, США, Канады и Австралии. Сохраняйте избранное и продолжайте воспроизведение при выключенном экране, если устройство поддерживает фоновое аудио.',live:'Прямой эфир',fav:'Избранные станции',background:'Фоновое воспроизведение',open:'Открыть Radio 63',go:'Открыть GO 63 Navigator',goText:'Нужна навигация? Откройте отдельное приложение GO 63 Navigator.',privacy:'Radio 63 предназначен для радио и избранных станций. Навигация находится в отдельном приложении GO 63.'},
      uk:{eyebrow:'RADIO 63',title:'Ваше радіо в дорозі',text:'Слухайте популярні станції Латвії, Великої Британії, України, США, Канади та Австралії. Зберігайте улюблені станції та продовжуйте відтворення з вимкненим екраном, якщо пристрій підтримує фонове аудіо.',live:'Онлайн-радіо',fav:'Улюблені станції',background:'Фонове відтворення',open:'Відкрити Radio 63',go:'Відкрити GO 63 Navigator',goText:'Потрібна навігація? Відкрийте окремий застосунок GO 63 Navigator.',privacy:'Radio 63 призначений для радіо та улюблених станцій. Навігація знаходиться в окремому GO 63.'}
    };
    var c=copy[lang]||copy.en;
    return h('main',{className:'welcome-shell radio63-welcome-shell'},
      h('section',{className:'welcome-card radio63-welcome-card'},
        h('a',{className:'admin-login-button',href:'?=admin',title:this.t('adminLogin'),'aria-label':this.t('adminLogin')},h(AppIcon,{name:'admin',size:20})),
        h('header',{className:'radio63-welcome-brandbar'},
          h('img',{src:'assets/radio63-logo.svg',alt:'Radio 63'}),
          h('a',{className:'radio63-welcome-go',href:'https://go.63.lv/',target:'_self',rel:'noopener'},h('img',{src:'assets/go63-logo.svg',alt:''}),h('span',null,c.go))
        ),
        h('section',{className:'radio63-welcome-hero'},
          h('div',{className:'radio63-welcome-copy'},
            h('span',{className:'eyebrow'},c.eyebrow),
            h('h1',null,c.title),
            h('p',null,c.text),
            h('div',{className:'feature-pills radio63-welcome-features'},
              h('span',null,'◉ ',c.live),
              h('span',null,'★ ',c.fav),
              h('span',null,'♫ ',c.background)
            ),
            h('div',{className:'radio63-welcome-actions'},
              h('button',{type:'button',className:'btn primary',onClick:function(){self.unlockOrientation();self.setState({entered:true,view:'radio'});}},c.open),
              h('a',{className:'btn secondary',href:'https://go.63.lv/',target:'_self',rel:'noopener'},c.go)
            )
          ),
          h('div',{className:'radio63-welcome-visual','aria-hidden':'true'},h('img',{src:'assets/radio63-icon.svg',alt:''}),h('strong',null,'Radio 63'),h('span',null,'LV · GB · UA · US · CA · AU'))
        ),
        h(LanguageSwitch,{value:this.state.lang,onChange:this.setLanguage,t:this.t.bind(this)}),
        h('a',{className:'radio63-welcome-crosslink',href:'https://go.63.lv/',target:'_self',rel:'noopener'},
          h('div',null,h('strong',null,c.go),h('span',null,c.goText)),h('img',{src:'assets/go63-logo.svg',alt:'GO 63 Navigator'})
        ),
        h('section',{className:'trust-panel radio63-welcome-trust'},h('div',{className:'trust-panel-title'},h('strong',null,'Radio 63'),h('span',null,'RADIO ONLY')),h('p',null,c.privacy)),
        h('div',{className:'welcome-actions'},h('button',{type:'button',className:'btn ghost',onClick:function(){self.setState({modal:'auth',authMode:'login'});}},this.t('signIn')),h('button',{type:'button',className:'btn ghost',onClick:function(){self.setState({modal:'auth',authMode:'register'});}},this.t('createAccount'))),
        !this.state.installed?h(InstallPlatforms,{onInstall:this.installApp,t:this.t.bind(this)}):null,
        h('div',{className:'welcome-footer-actions'},h('button',{type:'button',className:'support-link',onClick:function(){self.setState({modal:'feedback'});}},this.t('contactUs')+' · '+this.t('feedback')),this.state.app.newsletter&&this.state.app.newsletter.enabled?h('button',{type:'button',className:'support-link newsletter-link',onClick:function(){self.setState({modal:'newsletter'});}},this.t('subscribeNews')):null)
      )
    );
  };

  GoApp.prototype.renderRadioCountryTabs=function(){
    var self=this,lang=this.state.lang||'en';
    return h('div',{className:'radio-country-tabs radio63-country-tabs'},RADIO_COUNTRIES.map(function(code){return h('button',{type:'button',key:code,className:self.state.radioCountry===code?'active':'',onClick:function(){self.loadRadioStations(code);}},h('span',{className:'country-flag'},radio63Flag(code)),h('span',null,radio63CountryName(code,lang)));}));
  };
  GoApp.prototype.renderRadioView=function(){
    var self=this,lang=this.state.lang||'en';
    var stations=this.radio63PlayableStations();
    var favCount=radio63ReadFavourites().length;
    var stationContent;
    if(this.state.radioLoading){
      stationContent=h('div',{className:'empty-state'},h('div',{className:'spinner'}),radio63Text(lang,'loading'));
    }else if(!stations.length){
      stationContent=h('div',{className:'empty-state'},this.state.radio63FavouritesOnly?radio63Text(lang,'noFav'):radio63Text(lang,'none'));
    }else{
      stationContent=stations.map(function(station){
        var current=!!(self.state.player.station&&self.state.player.station.id===station.id&&self.state.player.station.country===station.country);
        var favourite=self.isRadio63Favourite(station);
        return h('div',{className:'station-card radio63-station'+(current&&self.isPlayerActive()?' playing':''),key:radio63Key(station)},
          h('button',{type:'button',className:'radio63-station-play',onClick:function(){self.playStation(station);}},
            h(StationLogo,{station:station}),
            h('span',{className:'radio63-station-copy'},h('h3',null,station.name),h('p',null,[station.codec,station.bitrate?station.bitrate+' kbps':'',station.tags].filter(Boolean).join(' · '))),
            h('span',{className:'play-circle'},h(AppIcon,{name:current&&self.isPlayerActive()?'pause':'play',size:20}))
          ),
          h('span',{className:'radio63-station-actions'},
            h('button',{type:'button',className:'radio63-favourite'+(favourite?' active':''),'aria-label':favourite?radio63Text(lang,'removeFav'):radio63Text(lang,'addFav'),title:favourite?radio63Text(lang,'removeFav'):radio63Text(lang,'addFav'),onClick:function(){self.toggleRadio63Favourite(station);}},favourite?'★':'☆'),
            h('button',{type:'button',className:'radio63-remove','aria-label':radio63Text(lang,'removeStation'),title:radio63Text(lang,'removeStation'),onClick:function(){self.radio63RemoveStation(station);}},'×')
          )
        );
      });
    }
    var directoryResults=this.state.radio63DirectoryResults||[];
    var directoryPanel=this.state.radio63DirectoryOpen?h('section',{className:'radio63-directory panel'},
      h('div',{className:'radio63-directory-head'},h('div',null,h('strong',null,radio63Text(lang,'findLive')),h('p',null,radio63Text(lang,'liveHelp'))),h('button',{type:'button',className:'icon-btn small',onClick:function(){self.setState({radio63DirectoryOpen:false});}},'×')),
      h('form',{className:'radio63-directory-search',onSubmit:function(e){e.preventDefault();self.radio63SearchDirectory();}},
        h('div',{className:'search-box'},h(AppIcon,{name:'search',size:18}),h('input',{value:this.state.radio63DirectoryQuery||'',onChange:function(e){self.setState({radio63DirectoryQuery:e.target.value});},placeholder:radio63Text(lang,'directoryPlaceholder')})),
        h('button',{type:'submit',className:'btn primary small'},radio63Text(lang,'find'))
      ),
      this.state.radio63DirectoryLoading?h('div',{className:'empty-state'},h('div',{className:'spinner'}),radio63Text(lang,'loading')):
      directoryResults.length?h('div',{className:'radio63-directory-results'},directoryResults.map(function(station){var added=self.radio63IsAdded(station);return h('div',{className:'radio63-directory-row',key:'dir-'+radio63Key(station)},h(StationLogo,{station:station}),h('div',{className:'radio63-directory-copy'},h('strong',null,station.name),h('span',null,[station.codec,station.bitrate?station.bitrate+' kbps':'',station.tags].filter(Boolean).join(' · '))),h('button',{type:'button',className:'btn '+(added?'secondary':'primary')+' small',disabled:added,onClick:function(){self.radio63AddStation(station);}},added?radio63Text(lang,'added'):radio63Text(lang,'add')));})):null
    ):null;
    return h('section',{className:'app-view page-view radio63-view'},
      h('div',{className:'radio63-brandbar'},
        h('img',{src:'assets/radio63-logo.svg',alt:'Radio 63'}),
        h('a',{className:'radio63-go-link',href:'https://go.63.lv/',target:'_self',rel:'noopener'},h('img',{src:'assets/go63-logo.svg',alt:''}),h('span',null,radio63Text(lang,'go')))
      ),
      h('header',{className:'radio63-home'},
        h('div',{className:'radio63-home-copy'},h('span',{className:'eyebrow'},'RADIO 63'),h('h1',null,radio63Text(lang,'title')),h('p',null,radio63Text(lang,'intro')),h('div',{className:'radio63-home-actions'},h('a',{className:'btn primary',href:'#stations'},radio63Text(lang,'browse')),h('a',{className:'btn secondary',href:'https://go.63.lv/',target:'_self',rel:'noopener'},radio63Text(lang,'go')))),
        h('div',{className:'radio63-home-badge','aria-hidden':'true'},'📻')
      ),
      h('div',{id:'stations',className:'radio63-stations-anchor'}),
      this.renderRadioCountryTabs(),
      h('div',{className:'radio63-toolbar'},
        h('button',{type:'button',className:'btn '+(this.state.radio63FavouritesOnly?'primary':'secondary'),onClick:function(){var next=!self.state.radio63FavouritesOnly;localStorage.setItem('radio63-favourites-only',next?'1':'0');self.setState({radio63FavouritesOnly:next});}},'★ '+radio63Text(lang,'favourites'),favCount?' ('+favCount+')':''),
        h('div',{className:'search-box radio63-search'},h(AppIcon,{name:'search',size:18}),h('input',{value:this.state.radioSearch,onChange:function(e){self.setState({radioSearch:e.target.value});},placeholder:radio63Text(lang,'search')})),
        h('button',{type:'button',className:'btn secondary radio63-add-stations',onClick:function(){var open=!self.state.radio63DirectoryOpen;self.setState({radio63DirectoryOpen:open});if(open&&!(self.state.radio63DirectoryResults||[]).length)self.radio63SearchDirectory();}},'+ '+radio63Text(lang,'addStations'))
      ),
      directoryPanel,
      !this.state.online?h('div',{className:'radio63-offline-note'},radio63Text(lang,'offline')):null,
      h('div',{className:'station-list radio63-stations'},stationContent)
    );
  };
  GoApp.prototype.renderBottomNav=function(){return null;};
  GoApp.prototype.renderApp=function(){
    var view=this.renderRadioView(),showPlayer=!!(this.state.player&&this.state.player.station);
    return h('main',{className:'app-shell radio63-shell'},h('div',{className:'app-content'},view),showPlayer?this.renderPlayer():null,this.renderModal(),this.state.toast?h('div',{className:'toast show'+(this.state.toastError?' error':'')},this.state.toast):null,this.state.loading?h('div',{className:'global-loader'},h('div',{className:'spinner'})):null);
  };




  /* Radio 63 1.3.4: resilient stream playback + on-device backup music.
     Selected audio is stored in IndexedDB when the browser allows it. It is
     never uploaded to the Radio 63 server. */
  var RADIO63_LOCAL_DB = 'radio63-local-audio-v1';
  var RADIO63_LOCAL_STORE = 'tracks';
  var RADIO63_LOCAL_LIMIT = 30;
  var RADIO63_LOCAL_TEXT = {
    en:{title:'Backup music',desc:'Choose MP3/audio files from this device. Radio 63 can play them at random if a stream drops or the internet goes offline.',choose:'Choose audio files',auto:'Automatic fallback',autoHelp:'Use random local music when live radio cannot continue.',random:'Random local (ad break)',returnRadio:'Return to live radio',clear:'Clear saved audio',saved:'saved on this device',none:'No local audio selected yet.',fallbackOffline:'Offline backup',fallbackStream:'Stream backup',fallbackManual:'Local music',savedToast:'Local backup music saved on this device.',clearedToast:'Saved local audio cleared.',saveError:'The files can be used now, but this browser could not save all of them for later.',adNote:'Live radio adverts are not exposed reliably by every stream. Use “Random local (ad break)” when you want to skip an advert manually.'},
    lv:{title:'Rezerves mūzika',desc:'Izvēlies MP3/audio failus no šīs ierīces. Ja radio straume apstājas vai pazūd internets, Radio 63 var nejauši atskaņot vietējo mūziku.',choose:'Izvēlēties audio failus',auto:'Automātiska rezerve',autoHelp:'Ja tiešraides radio nevar turpināties, atskaņot nejaušu vietējo mūziku.',random:'Nejauša dziesma (reklāmas pauze)',returnRadio:'Atgriezties tiešraidē',clear:'Notīrīt saglabāto audio',saved:'saglabāti šajā ierīcē',none:'Vietējie audio faili vēl nav izvēlēti.',fallbackOffline:'Bezsaistes rezerve',fallbackStream:'Straumes rezerve',fallbackManual:'Vietējā mūzika',savedToast:'Rezerves mūzika saglabāta šajā ierīcē.',clearedToast:'Saglabātais vietējais audio notīrīts.',saveError:'Failus var izmantot tagad, bet pārlūks nevarēja visus saglabāt vēlākai lietošanai.',adNote:'Tiešraides radio reklāmas ne visas straumes ļauj droši noteikt. Izmanto “Nejauša dziesma (reklāmas pauze)”, ja reklāmas laikā vēlies ieslēgt savu mūziku.'},
    ru:{title:'Резервная музыка',desc:'Выберите MP3/аудиофайлы на этом устройстве. Если поток радио остановится или пропадёт интернет, Radio 63 сможет случайно включать локальную музыку.',choose:'Выбрать аудиофайлы',auto:'Автоматический резерв',autoHelp:'Включать случайную локальную музыку, если эфир не может продолжаться.',random:'Случайный трек (реклама)',returnRadio:'Вернуться к эфиру',clear:'Очистить сохранённые аудио',saved:'сохранено на устройстве',none:'Локальные аудиофайлы ещё не выбраны.',fallbackOffline:'Резерв без интернета',fallbackStream:'Резерв потока',fallbackManual:'Локальная музыка',savedToast:'Резервная музыка сохранена на этом устройстве.',clearedToast:'Сохранённые локальные аудио удалены.',saveError:'Файлы можно использовать сейчас, но браузеру не удалось сохранить все из них на будущее.',adNote:'Рекламу в прямом эфире нельзя надёжно определить во всех потоках. Используйте “Случайный трек (реклама)” вручную.'},
    uk:{title:'Резервна музика',desc:'Виберіть MP3/аудіофайли на цьому пристрої. Якщо радіопотік зупиниться або зникне інтернет, Radio 63 зможе випадково відтворювати локальну музику.',choose:'Вибрати аудіофайли',auto:'Автоматичний резерв',autoHelp:'Вмикати випадкову локальну музику, якщо прямий ефір не може продовжуватися.',random:'Випадковий трек (реклама)',returnRadio:'Повернутися до ефіру',clear:'Очистити збережене аудіо',saved:'збережено на пристрої',none:'Локальні аудіофайли ще не вибрані.',fallbackOffline:'Резерв без інтернету',fallbackStream:'Резерв потоку',fallbackManual:'Локальна музика',savedToast:'Резервну музику збережено на цьому пристрої.',clearedToast:'Збережені локальні аудіо очищено.',saveError:'Файли можна використовувати зараз, але браузеру не вдалося зберегти всі з них для подальшого використання.',adNote:'Рекламу в прямому ефірі неможливо надійно визначити в кожному потоці. Використовуйте “Випадковий трек (реклама)” вручну.'}
  };
  function radio63LocalText(lang,key){var row=RADIO63_LOCAL_TEXT[lang]||RADIO63_LOCAL_TEXT.en;return row[key]!==undefined?row[key]:RADIO63_LOCAL_TEXT.en[key];}
  function radio63LocalDbOpen(){
    return new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB unavailable'));return;}
      var request;
      try{request=indexedDB.open(RADIO63_LOCAL_DB,1);}catch(error){reject(error);return;}
      request.onupgradeneeded=function(){var db=request.result;if(!db.objectStoreNames.contains(RADIO63_LOCAL_STORE))db.createObjectStore(RADIO63_LOCAL_STORE,{keyPath:'id'});};
      request.onsuccess=function(){resolve(request.result);};
      request.onerror=function(){reject(request.error||new Error('IndexedDB open failed'));};
    });
  }
  function radio63LocalLoad(){
    return radio63LocalDbOpen().then(function(db){return new Promise(function(resolve,reject){
      var rows=[],tx=db.transaction(RADIO63_LOCAL_STORE,'readonly'),store=tx.objectStore(RADIO63_LOCAL_STORE),request=store.openCursor();
      request.onsuccess=function(){var cursor=request.result;if(cursor){rows.push(cursor.value);cursor.continue();}else resolve(rows);};
      request.onerror=function(){reject(request.error||new Error('IndexedDB read failed'));};
      tx.oncomplete=function(){try{db.close();}catch(_){}};
      tx.onerror=function(){reject(tx.error||new Error('IndexedDB transaction failed'));};
    });});
  }
  function radio63LocalSave(rows){
    rows=(rows||[]).slice(-RADIO63_LOCAL_LIMIT);
    return radio63LocalDbOpen().then(function(db){return new Promise(function(resolve,reject){
      var tx=db.transaction(RADIO63_LOCAL_STORE,'readwrite'),store=tx.objectStore(RADIO63_LOCAL_STORE);
      rows.forEach(function(row){store.put({id:row.id,name:row.name,type:row.type||'',size:row.size||0,lastModified:row.lastModified||0,blob:row.file||row.blob});});
      tx.oncomplete=function(){try{db.close();}catch(_){}resolve();};
      tx.onerror=function(){reject(tx.error||new Error('IndexedDB write failed'));};
      tx.onabort=function(){reject(tx.error||new Error('IndexedDB write aborted'));};
    });});
  }
  function radio63LocalClearDb(){
    return radio63LocalDbOpen().then(function(db){return new Promise(function(resolve,reject){
      var tx=db.transaction(RADIO63_LOCAL_STORE,'readwrite');tx.objectStore(RADIO63_LOCAL_STORE).clear();
      tx.oncomplete=function(){try{db.close();}catch(_){}resolve();};tx.onerror=function(){reject(tx.error||new Error('IndexedDB clear failed'));};
    });});
  }
  function radio63TrackId(file){return 'local-'+String(file.name||'audio').replace(/[^a-z0-9._-]+/gi,'-').slice(0,80)+'-'+Number(file.size||0)+'-'+Number(file.lastModified||0);}

  GoApp.prototype.radio63LocalFallbackEnabled=function(){return localStorage.getItem('radio63-local-fallback-enabled')!=='0';};
  GoApp.prototype.radio63SetLocalFallbackEnabled=function(enabled){localStorage.setItem('radio63-local-fallback-enabled',enabled?'1':'0');this.setState({radio63LocalVersion:Number(this.state.radio63LocalVersion||0)+1});};
  GoApp.prototype.radio63HasLocalTracks=function(){return !!(this.state.localTracks&&this.state.localTracks.length);};
  GoApp.prototype.radio63LoadLocalTracks=function(){var self=this;return radio63LocalLoad().then(function(rows){var tracks=(rows||[]).filter(function(row){return row&&row.blob;}).map(function(row){return {id:row.id,name:row.name||'Local audio',type:row.type||'',size:row.size||0,lastModified:row.lastModified||0,file:row.blob};});if(tracks.length)self.setState({localTracks:tracks.slice(-RADIO63_LOCAL_LIMIT)});}).catch(function(){});};

  var radio63HandleLocalFiles133=GoApp.prototype.handleLocalFiles;
  GoApp.prototype.handleLocalFiles=function(event){
    var self=this,files=Array.prototype.slice.call(event&&event.target&&event.target.files||[]).filter(function(file){return String(file.type||'').indexOf('audio/')===0||/\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i.test(String(file.name||''));});
    if(event&&event.target)try{event.target.value='';}catch(_){}
    if(!files.length)return;
    var existing=(this.state.localTracks||[]).slice(),byId={};
    existing.forEach(function(track){byId[track.id]=track;});
    files.forEach(function(file){var row={id:radio63TrackId(file),name:String(file.name||'Local audio').replace(/\.[^.]+$/,''),type:file.type||'',size:file.size||0,lastModified:file.lastModified||0,file:file};byId[row.id]=row;});
    var merged=Object.keys(byId).map(function(id){return byId[id];}).slice(-RADIO63_LOCAL_LIMIT);
    this.setState({localTracks:merged,radio63LocalVersion:Number(this.state.radio63LocalVersion||0)+1});
    radio63LocalSave(merged).then(function(){self.showToast(radio63LocalText(self.state.lang,'savedToast'));}).catch(function(){self.showToast(radio63LocalText(self.state.lang,'saveError'),true);});
  };

  GoApp.prototype.radio63PickRandomTrack=function(){
    var rows=this.state.localTracks||[];if(!rows.length)return null;
    var current=this.state.localTrackIndex,index=Math.floor(Math.random()*rows.length);
    if(rows.length>1&&index===current)index=(index+1+Math.floor(Math.random()*(rows.length-1)))%rows.length;
    return {track:rows[index],index:index};
  };
  GoApp.prototype.radio63FallbackDetail=function(reason,station){
    var key=reason==='offline'?'fallbackOffline':(reason==='stream'?'fallbackStream':'fallbackManual');
    return radio63LocalText(this.state.lang,key)+(station&&station.name?' · '+station.name:'');
  };
  GoApp.prototype.radio63StartLocalFallback=function(reason,forcedIndex){
    var self=this,rows=this.state.localTracks||[],pick=(forcedIndex!==undefined&&forcedIndex!==null&&rows[forcedIndex])?{track:rows[forcedIndex],index:forcedIndex}:this.radio63PickRandomTrack();if(!pick)return false;
    var station=this.radio63FallbackStation||this.activeStation||((this.audioKind==='radio'&&this.state.player)?this.state.player.station:null);
    if(station&&station.country!=='LOCAL')this.radio63FallbackStation=station;
    clearTimeout(this.audioTimer);clearTimeout(this.reconnectTimer);clearTimeout(this.radio63OfflineFallbackTimer);clearTimeout(this.radio63ReturnTimer);
    this.playerWanted=false;this.streamAttempt+=1;this.failedStreamAttempt=-1;this.reconnectAttempt=0;
    if(this.hls){try{this.hls.destroy();}catch(_){}this.hls=null;}
    var old=this.audio;this.audio=null;if(old){try{old.pause();}catch(_){}try{old.removeAttribute('src');old.load();}catch(_){}}
    if(this.localObjectUrl){try{URL.revokeObjectURL(this.localObjectUrl);}catch(_){}this.localObjectUrl=null;}
    var blob=pick.track.file||pick.track.blob;if(!blob)return false;
    try{this.localObjectUrl=URL.createObjectURL(blob);}catch(_){return false;}
    var audio=new Audio();this.audio=audio;this.audioKind='local-fallback';this.radio63FallbackMode=reason||'manual';
    audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','');audio.src=this.localObjectUrl;
    audio.addEventListener('playing',function(){if(audio!==self.audio||self.audioKind!=='local-fallback')return;self.setPlayerState({status:'playing',playing:true,detail:self.radio63FallbackDetail(self.radio63FallbackMode,self.radio63FallbackStation)});});
    audio.addEventListener('pause',function(){if(audio!==self.audio||self.audioKind!=='local-fallback')return;if(!audio.ended)self.setPlayerState({status:'paused',playing:false,detail:self.radio63FallbackDetail(self.radio63FallbackMode,self.radio63FallbackStation)});});
    audio.addEventListener('ended',function(){if(audio!==self.audio||self.audioKind!=='local-fallback')return;self.radio63FinishFallbackTrack();});
    audio.addEventListener('error',function(){if(audio!==self.audio||self.audioKind!=='local-fallback')return;if((self.state.localTracks||[]).length>1)self.radio63StartLocalFallback(self.radio63FallbackMode);else self.radio63FinishFallbackTrack();});
    this.setState({localTrackIndex:pick.index,player:{station:{id:pick.track.id,name:pick.track.name,country:'LOCAL',favicon:''},status:'connecting',playing:false,detail:this.radio63FallbackDetail(reason,station),kind:'local'}},function(){
      var promise;try{promise=audio.play();}catch(error){promise=null;self.showToast(error&&error.message?error.message:'Audio playback could not start.',true);}if(promise&&promise.catch)promise.catch(function(error){self.setPlayerState({status:'paused',playing:false});if(error&&error.name!=='AbortError')self.showToast(error.message||'Audio playback could not start.',true);});
    });
    if('mediaSession' in navigator){
      try{if(window.MediaMetadata)navigator.mediaSession.metadata=new MediaMetadata({title:pick.track.name,artist:'Radio 63 backup music',album:'On-device audio'});}catch(_){}
      try{navigator.mediaSession.setActionHandler('play',function(){if(self.audio&&self.audioKind==='local-fallback'){var p=self.audio.play();if(p&&p.catch)p.catch(function(){});}});}catch(_){}
      try{navigator.mediaSession.setActionHandler('pause',function(){if(self.audio&&self.audioKind==='local-fallback')self.audio.pause();});}catch(_){}
      try{navigator.mediaSession.setActionHandler('nexttrack',function(){self.radio63StartLocalFallback(self.radio63FallbackMode);});}catch(_){}
      try{navigator.mediaSession.setActionHandler('previoustrack',function(){self.radio63StartLocalFallback(self.radio63FallbackMode);});}catch(_){}
    }
    return true;
  };
  GoApp.prototype.radio63FinishFallbackTrack=function(){
    if(this.radio63FallbackStation&&navigator.onLine!==false){this.radio63ReturnToRadio();return;}
    if(this.radio63HasLocalTracks()){this.radio63StartLocalFallback(this.radio63FallbackMode||'offline');return;}
    this.setPlayerState({status:'paused',playing:false,detail:''});
  };
  GoApp.prototype.radio63ReturnToRadio=function(){
    var self=this,station=this.radio63FallbackStation||this.activeStation;if(!station||station.country==='LOCAL')return false;
    clearTimeout(this.radio63ReturnTimer);clearTimeout(this.radio63OfflineFallbackTimer);
    var old=this.audio;this.audio=null;if(old){try{old.pause();}catch(_){}try{old.removeAttribute('src');old.load();}catch(_){}}
    if(this.localObjectUrl){try{URL.revokeObjectURL(this.localObjectUrl);}catch(_){}this.localObjectUrl=null;}
    this.audioKind='radio';this.activeStation=station;this.playerCandidates=this.buildStreamCandidates(station);this.playerUrlIndex=0;this.reconnectAttempt=0;this.playerWanted=true;
    this.setState({localTrackIndex:-1,player:{station:station,status:'connecting',playing:false,detail:'',kind:'radio'}},function(){self.startStream(station);});
    return true;
  };
  GoApp.prototype.radio63ClearLocalTracks=function(){
    var self=this;
    if(this.audioKind==='local-fallback'){if(this.radio63FallbackStation&&navigator.onLine!==false)this.radio63ReturnToRadio();else this.stopPlayer();}
    this.setState({localTracks:[],localTrackIndex:-1,radio63LocalVersion:Number(this.state.radio63LocalVersion||0)+1});
    radio63LocalClearDb().catch(function(){}).then(function(){self.showToast(radio63LocalText(self.state.lang,'clearedToast'));});
  };

  var radio63PlayStation133=GoApp.prototype.playStation;
  GoApp.prototype.playStation=function(station){this.radio63FallbackStation=station;this.radio63FallbackMode=null;clearTimeout(this.radio63OfflineFallbackTimer);clearTimeout(this.radio63ReturnTimer);return radio63PlayStation133.call(this,station);};

  var radio63SetupAudio133=GoApp.prototype.setupAudio;
  GoApp.prototype.setupAudio=function(attempt){
    radio63SetupAudio133.call(this,attempt);
    var self=this,audio=this.audio,expected=attempt==null?this.streamAttempt:attempt;if(!audio)return;
    audio.preload='auto';
    audio.addEventListener('waiting',function(){if(audio!==self.audio||self.audioKind!=='radio'||expected!==self.streamAttempt||!self.playerWanted||audio.paused)return;self.scheduleRadioFailure(8000,expected);});
    audio.addEventListener('stalled',function(){if(audio!==self.audio||self.audioKind!=='radio'||expected!==self.streamAttempt||!self.playerWanted)return;self.scheduleRadioFailure(6500,expected);});
  };

  var radio63Failure133=GoApp.prototype.radioFailure;
  GoApp.prototype.radioFailure=function(attempt){
    var expected=attempt==null?this.streamAttempt:attempt;
    var finalCandidate=this.playerCandidates&&this.playerCandidates.length?this.playerUrlIndex+1>=this.playerCandidates.length:true;
    if(this.audioKind==='radio'&&this.playerWanted&&expected===this.streamAttempt&&finalCandidate&&this.radio63LocalFallbackEnabled()&&this.radio63HasLocalTracks()){
      this.radio63StartLocalFallback(navigator.onLine===false?'offline':'stream');return;
    }
    return radio63Failure133.call(this,attempt);
  };

  var radio63TogglePlayer133=GoApp.prototype.togglePlayer;
  GoApp.prototype.togglePlayer=function(){
    if(this.audioKind==='local-fallback'){
      if(!this.audio)return;
      if(!this.audio.paused){this.audio.pause();this.setPlayerState({status:'paused',playing:false});}
      else{var p=this.audio.play();if(p&&p.catch)p.catch(function(){});}
      return;
    }
    return radio63TogglePlayer133.call(this);
  };
  var radio63ResumePlayer133=GoApp.prototype.resumePlayer;
  GoApp.prototype.resumePlayer=function(){if(this.audioKind==='local-fallback'){if(this.audio){var p=this.audio.play();if(p&&p.catch)p.catch(function(){});}return;}return radio63ResumePlayer133.call(this);};
  var radio63StopPlayer133=GoApp.prototype.stopPlayer;
  GoApp.prototype.stopPlayer=function(){clearTimeout(this.radio63OfflineFallbackTimer);clearTimeout(this.radio63ReturnTimer);this.radio63FallbackStation=null;this.radio63FallbackMode=null;return radio63StopPlayer133.call(this);};

  GoApp.prototype.renderRadio63LocalFallback=function(){
    var self=this,lang=this.state.lang||'en',tracks=this.state.localTracks||[],enabled=this.radio63LocalFallbackEnabled(),active=this.audioKind==='local-fallback';
    return h('section',{className:'panel radio63-local-backup'},
      h('div',{className:'radio63-local-head'},h('div',null,h('span',{className:'eyebrow'},'OFFLINE + AD BREAK'),h('h2',null,radio63LocalText(lang,'title')),h('p',null,radio63LocalText(lang,'desc'))),h('div',{className:'radio63-local-count'},String(tracks.length),h('span',null,' '+radio63LocalText(lang,'saved')))),
      h('div',{className:'radio63-local-actions'},
        h('label',{className:'btn primary file-picker'},radio63LocalText(lang,'choose'),h('input',{type:'file',accept:'audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac,.opus',multiple:true,onChange:this.handleLocalFiles})),
        h('button',{type:'button',className:'btn secondary',disabled:!tracks.length,onClick:function(){self.radio63StartLocalFallback('manual');}},radio63LocalText(lang,'random')),
        active&&this.radio63FallbackStation?h('button',{type:'button',className:'btn secondary',onClick:function(){self.radio63ReturnToRadio();}},radio63LocalText(lang,'returnRadio')):null,
        tracks.length?h('button',{type:'button',className:'btn ghost',onClick:function(){self.radio63ClearLocalTracks();}},radio63LocalText(lang,'clear')):null
      ),
      h('div',{className:'radio63-local-switch'},h('div',null,h('strong',null,radio63LocalText(lang,'auto')),h('span',null,radio63LocalText(lang,'autoHelp'))),h('button',{type:'button',className:'switch '+(enabled?'on':''),'aria-pressed':enabled?'true':'false',onClick:function(){self.radio63SetLocalFallbackEnabled(!enabled);}},h('span'))),
      tracks.length?h('div',{className:'radio63-local-tracks'},tracks.slice(0,8).map(function(track,index){return h('button',{type:'button',key:track.id,className:active&&self.state.localTrackIndex===index?'active':'',onClick:function(){self.radio63StartLocalFallback('manual',index);}},'♫ ',track.name);}),tracks.length>8?h('span',{className:'radio63-local-more'},'+'+(tracks.length-8)):null):h('p',{className:'radio63-local-empty'},radio63LocalText(lang,'none')),
      h('p',{className:'radio63-local-note'},radio63LocalText(lang,'adNote'))
    );
  };

  var radio63RenderView133=GoApp.prototype.renderRadioView;
  GoApp.prototype.renderRadioView=function(){var base=radio63RenderView133.call(this),children=React.Children.toArray(base.props.children);children.push(this.renderRadio63LocalFallback());return React.cloneElement(base,base.props,children);};

  var radio63DidMount133=GoApp.prototype.componentDidMount;
  GoApp.prototype.componentDidMount=function(){
    var result=radio63DidMount133.call(this),self=this;this.radio63LoadLocalTracks();
    this.radio63OfflineHandler=function(){clearTimeout(self.radio63OfflineFallbackTimer);self.radio63OfflineFallbackTimer=setTimeout(function(){if(navigator.onLine===false&&self.audioKind==='radio'&&self.playerWanted&&self.radio63LocalFallbackEnabled()&&self.radio63HasLocalTracks())self.radio63StartLocalFallback('offline');},3500);};
    this.radio63FallbackOnlineHandler=function(){clearTimeout(self.radio63OfflineFallbackTimer);if(self.audioKind==='local-fallback'&&self.radio63FallbackStation&&self.radio63FallbackMode!=='manual'){clearTimeout(self.radio63ReturnTimer);self.radio63ReturnTimer=setTimeout(function(){if(navigator.onLine!==false&&self.audioKind==='local-fallback')self.radio63ReturnToRadio();},3000);}};
    window.addEventListener('offline',this.radio63OfflineHandler);window.addEventListener('online',this.radio63FallbackOnlineHandler);return result;
  };
  var radio63WillUnmount133=GoApp.prototype.componentWillUnmount;
  GoApp.prototype.componentWillUnmount=function(){clearTimeout(this.radio63OfflineFallbackTimer);clearTimeout(this.radio63ReturnTimer);if(this.radio63OfflineHandler)window.removeEventListener('offline',this.radio63OfflineHandler);if(this.radio63FallbackOnlineHandler)window.removeEventListener('online',this.radio63FallbackOnlineHandler);return radio63WillUnmount133.call(this);};

  var root = document.getElementById('go-app-root');
  ReactDOM.render(h(AppErrorBoundary,null,h(GoApp)), root);
}());

/* go-app 2.6.20: smooth navigation, live-first speed guidance and managed road alerts. */
