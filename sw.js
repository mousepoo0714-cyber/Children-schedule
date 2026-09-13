/* 우리 아이 시간표 — 서비스 워커
   앱 껍데기를 캐시해서 오프라인에서도 열리게 한다.
   일정 데이터는 Firebase가 따로 오프라인 캐시를 관리한다. */

var CACHE = "schedule-v1";
var SHELL = ["./", "./index.html", "./manifest.json",
             "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
      .catch(function(){})
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch(err){ return; }

  // Firebase 등 외부 요청은 건드리지 않는다
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 새 버전 우선, 실패하면 캐시
  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copy); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match("./index.html");
      })
    );
    return;
  }

  // 나머지 정적 파일: 캐시 우선
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if (res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      });
    }).catch(function(){ return caches.match("./index.html"); })
  );
});
