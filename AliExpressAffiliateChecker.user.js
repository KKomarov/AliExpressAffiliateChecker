// ==UserScript==
// @name AliExpress Affiliate Checker
// @description Проверяет аффилиатность товаров на AliExpress
// @author longnull, KKomarov
// @version 1.3
// @homepage https://github.com/KKomarov/AliExpressAffiliateChecker
// @supportURL https://github.com/KKomarov/AliExpressAffiliateChecker/issues
// @updateURL https://raw.githubusercontent.com/KKomarov/AliExpressAffiliateChecker/master/AliExpressAffiliateChecker.user.js
// @downloadURL https://raw.githubusercontent.com/KKomarov/AliExpressAffiliateChecker/master/AliExpressAffiliateChecker.user.js
// @match *://*.aliexpress.com/item/*
// @match *://*.aliexpress.com/i/*
// @match *://*.aliexpress.ru/item/*
// @match *://*.aliexpress.ru/i/*
// @grant GM_xmlhttpRequest
// @grant GM.xmlHttpRequest
// @connect backit.me
// @connect megabonus.com
// @connect letyshops.com
// @connect skidka.ru
// ==/UserScript==

(() => {
  'use strict';

  //=========================================================================================

  const config = {
    // true - автоматическая проверка при открытии страницы товара
    // false - проверка при клике по цене на странице товара
    autoCheck: false,
    // Сервисы, которыми будет проверяться аффилиатность товаров
    // Доступные значения:
    //   backit - backit.me Отображается процент кэшбэка и статус повышенного кэшбэка
    //   megabonus - megabonus.com
    //   letyshops - letyshops.com
    //   skidka - skidka.ru Отображается процент кэшбэка
    services: ['backit', 'megabonus', 'skidka'],
    backitUserId: '9097cf2568dd74f44c3095930fff2fc8',
    letyShopsAliUserId: 'vv3q4oey1vc09fee9900b6d1781017',
    megabonusUserId: '3101410',
    // Цвет индикации: аффилиатный товар
    colorAffiliate: '#deffde',
    // Цвет индикации: неаффилиатный товар
    colorNotAffiliate: '#ffdede',
    // Цвет индикации: не удалось проверить
    colorError: '#e3e3e3'
  };

  //=========================================================================================

  const httpRequest = (params) => {
    return new Promise((resolve) => {
      params.timeout = 30000;
      params.onload = resolve;
      params.onerror = resolve;
      params.ontimeout = resolve;
      params.onabort = resolve;

      const func = typeof GM !== 'undefined' ? GM.xmlHttpRequest : GM_xmlhttpRequest;
      func(params);
    });
  };

  function currentItemUrl() {
    return (location.origin + location.pathname).replace('/i/', '/item/');
  }

  function currentItemEncoded() {
    return encodeURIComponent(currentItemUrl());
  }

  const services = {
    backit: {
      name: 'Backit',
      url: `https://shopnow.pub/redirect/cpa/u/${config.backitUserId}/ali/?to=${currentItemEncoded()}`,
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAALVBMVEVHcEwAAAAAAADP/ADP/AAuOABmfADI9ADd/wDP/QDP/AAAAADK9wA7SABlewDkN1KPAAAACnRSTlMAtga2BuoMuAa2jOpPLgAAAD9JREFUKM9jWAUHix0YQGBQCZwBgeNJSkAAFljz9i4QXBUEAYjA7d1wMHgFjIFgejSSgAsQtEkjCYAA0yAUAAC0Lx1dRjeOxQAAAABJRU5ErkJggg==',
      async check() {
        const response = await httpRequest({
          method: 'GET',
          url: `https://app.backit.me/affiliate/checkLink?link=${currentItemEncoded()}`,
          headers: {
            'X-API-VERSION': '2.1',
            'X-CLIENT-ID': 'web-client'
          }
        });

        if (response.status !== 200) {
          return null;
        }

        try {
          const res = JSON.parse(response.responseText);

          if (!res.result || res.data.attributes.affiliateType === 0) {
            return null;
          }

          return {
            affiliate: res.data.attributes.affiliateType !== 2,
            rate: res.data.attributes.cashback.replace(/ /g, ''),
            hot: res.data.attributes.isHotsale
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      },
    },
    megabonus: {
      name: 'MegaBonus',
      url: `https://a.megabonus.com/goto?UserID=${config.megabonusUserId}&UserLevel=1&ShopID=463&Revshare=1&Project=cashback&TrafficType=extension&AppVersion=4.2.2&Deeplink=${currentItemEncoded()}&Component=auto_redirect`,
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyMTQzMjdjNi05YmEyLTRmY2ItOGMxOS0zYWJlZDA3NDM1Y2UiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MjNFMjIxRkEzMTk1MTFFN0JDNzJDNkEzNEQ2MEQwQTgiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MjNFMjIxRjkzMTk1MTFFN0JDNzJDNkEzNEQ2MEQwQTgiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoyMTQzMjdjNi05YmEyLTRmY2ItOGMxOS0zYWJlZDA3NDM1Y2UiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MjE0MzI3YzYtOWJhMi00ZmNiLThjMTktM2FiZWQwNzQzNWNlIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+JsU1JwAAAWJJREFUeNpi/H+fg4GWgHHUglELRi1gYMJureIPZJRV+xtTTWjWbzRlJPgATbUgP+PzU+zsbAiRT18YxE1+/PiJogurUUzEePP9x/8bd/9FFlm99S+a6aQFESZYtA7FgmWb/lIUB3AgL80IYew8+O/F6/8Q9rOX/w+c+Adhy0gwUmRBiBczBzuI8ecvw5INUFcv3fj3H9h8VQVGWzMmiixgZWEIcGOGsBeugVqwbCPU+YmhzIyMFMdBQgjUgiu3/p+9/O/a7f8XroEsYGFmiAtiJqidhaAKVxsmYEA/eQGKgIVr//JwQ93sbs8kLcH46fN/Sn3AxMQQE8gMSzz/lqyHBlRyGEjwP1WSKTyU3r7///g5yEwxYUYfZ2aq5QN1JUYrYxSVwNBnZaFGPvj1G2EisnhSGDN1Mtr3H9BAjvBl5oSVNEDfaKowUscCOODnRWSIpFBinT9ao41aMGoBGAAEGACGkZKwffDXMwAAAABJRU5ErkJggg==',
      async check() {
        let fd = new FormData();
        fd.append('url', currentItemUrl());
        const response = await httpRequest({
          method: 'POST',
          url: `https://megabonus.com/check-cashback/check`,
          data: fd
        });

        if (response.status !== 200) {
          return null;
        }

        try {
          const res = JSON.parse(response.responseText);

          if (res.errors.length) {
            return null;
          }

          return {
            affiliate: res.isAffiliate,
            rate: res.itemData.commission_rate,
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      },
    },
    letyshops: {
      name: 'LetyShops',
      url: `https://ad.admitad.com/goto/${config.letyShopsAliUserId}/?ulp=${currentItemEncoded()}`,
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA/FBMVEVHcEz////80xv80xv////80xv80hX////////////////80xv////////80xv931n/+eD80xv///8SEhIPEBH80xj/1hsODg7///8LCwz80xr/+ub+3lD91SH+1RmFcBX82DL/9sr+7aL//vj95Xd7e3suLi4aGhrV1dUWFha3t7ckJCTe3t6Hh4fx8fEbGRL8/Pztxxr19fXFphmCgoJqamo6OjtYWFWqqqr954L78snr6+uxsbFFRUXBwcGmkS6hoaGRkZErJxOpjxhLS0uSexeQkJBEOxTbuBpjVRVmZmbk5OTJyclQUFB0dHSfhhd7bSzR0dH44HLr59O3cCE7AAAAEXRSTlMAyt+P3/wj/I8j3srJNzfJN1GHnoUAAAE7SURBVDjLfZPXcsIwEEWXEmxIRZLRUJ0GtjHF9PSQ3vv//0tWprlInNc90uzO3AsAmVRyIx/BOCVES+tZQHY28zGMSpkIEtv4XjbfPyAztrKQis9L1UOyQIek5IPjo6WQg/B+BaQ2X8BHg9C892Ca5vUZCRASCoMuY8URUQt3lFJ2s0YwGaVOUy3kX1BwbbXQe2KUj8+VQu35FoWJpxYGXUp5nSiFwhceQadKoVT9xh2tK7XwO+GUNVoqwaj8jTnllx2FgBmwXdzx1ZMLIgNNB4U2kQsiA1O8gY/6UsEP4Ym40vr4rNsxYRbCH5eJP7j1HhXmIfTqVBis8RYVFiHstBsO58X7fkQwliH0WhePw2EoEBjaVQskaJAMtiBODosTaEEcHTK75TVzrB7sJdRzUV6ArJ7WpPv59f8Hhs9SMrQm3HEAAAAASUVORK5CYII=',
      async check() {
        const response = await httpRequest({
          method: 'GET',
          url: `https://letyshops.com/product-check-cashback?shop=aliexpress&product=${currentItemEncoded()}`
        });

        if (response.status !== 200) {
          return null;
        }

        try {
          const res = JSON.parse(response.responseText);

          if (!res.data) {
            return null;
          }

          return {
            affiliate: res.data.valid
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      },
    },
    skidka: {
      name: 'Skidka.ru',
      url: 'https://skidka.ru/shops/details/aliexpress-keshbek',
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAhCAYAAAC4JqlRAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAOGSURBVHgBtVc9TFNRFP7uoyFOUiMQJTEWRqiBhA0ZGBhkMKmDyqKUQRypCX+LAeMCQsLPJgvgBJOYGHUgARNkM3YARyxqEJHEwgLhp9dzevvKa3l99xbhS9rbd9/pPd8595xzzxXIE8UdsgEWaizALwWu85yQWEsAcSQQ3RoSC/msJ0yEWKkoQAsJh+jRrxGPS2BWHmHKhIwngZJOWUPWDpNQA04BIrJwINAa7xexXDJWrhcl3bJdWPhyWuUM/m+hxLfSLtnrIXMSpd1ygoYwzhDkjck/A6IVOgKnUR4sA5oq1e/BOeRFImMLUq4K51rg4gVg7K4anai6CnQ0Ao/q4QmyNkxbO+xKgAIuTBJ9XgtMPQTu1wKv2zJJLK2qsYjmblZARyJS3EOpnE2AAq4XGjx9C+zsKZc7Sfz4qz6MugpoYUlM+CPSnyaQtB4I6P64vA7cGXcn8WnVnADrKixEJE3AxHodiSUHgewYcYVAe5JAsrQaWJ9NouWV+s0kxu4dE2DcKDNaxs+xYFGJDSFP2BbaSjkFOxuP4+BWpdk6dIaEfDRWwxCs+DGlWlv9STdzdthoqlIBqyVAnvcJQ/ezQt7vYMq9HAPfyeKdXTXnJHTtknpmGQ2q2QMBGIBdzIp40ZeLwPhipgIuRCxjg70w81m7bMAHQ7BLt/dUAH74evL90JyKAa6UjCBVxxmDdS3kAVbiptwGW2wHZtAsE5IEYjhD8NYwqswIRJlAVCfVXKs+JgVmOxUXRSbFCFjzJSQ+WsK7Fjy/rZTz4u9XYIRtfQZwHViwDulLJ8iBx6grhxbNqXqwsq6XpSNg1ooPiij3bl6C06l04gLkFVz8zi5I0/oUjG5Qr5jMAmqvn3lJOqN78kFm1bPB5ZcLFYNPRl0NIJ2jPKZbMupU5r0aUK5urIBHBuf88i/a613VhDjn+bS0z4UciG0OiPJMAtSC057Mw6PvZyVc8Zpr3d9zCnJPqCvBFPTlG6lWPaMpLe6SEXo5DA2YSJ3D6p9k7bsVo9rPkf/k9wsxkn7OFijtkX3Uvho3KHmBYm2zX/RlTrngXEi4KFfTOXC5S4YK1HYE8H+IJeh6ttXvfk/0vBte6ZGBBN8TZLJ/011KsxGn1Uf39zASHxHxXEJGt2MmcsQpKpM35AYPUb4ZR6XEm8N9THopzotANriZlAn4LcvhlSNEDw4QM1HqxD+obDGc+ZOlwgAAAABJRU5ErkJggg==',
      async check() {
        const response = await httpRequest({
          method: 'GET',
          url: `https://skidka.ru/check_ali_affiliate?checkUrl=${currentItemEncoded()}`
        });

        if (response.status !== 200) {
          return null;
        }

        try {
          const res = JSON.parse(response.responseText);

          if (!res.isSuccess) {
            return null;
          }

          return {
            affiliate: res.isAffiliateItem,
            rate: `${res.CommissionRate}%`
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      }
    }
  }

  const check = async () => {
    if (elementPrice) {
      elementPrice.removeEventListener('click', check);
      elementPrice.style.cursor = null;
      elementPrice.title = '';
    }

    const main = document.createElement('div');
    main.id = 'affiliate-checker';

    const style = document.createElement('style');
    style.innerHTML = `
      #affiliate-checker {
        width: 300px;
        max-width: 100%;
        margin: 8px 0;
        border: 1px solid #e3e3e3;
      }
      #affiliate-checker .affiliate-checker-item {
        display: flex;
        align-items: center;
      }
      #affiliate-checker .affiliate-checker-item:not(:first-child) {
        border-top: 1px solid #e3e3e3;
      }
      #affiliate-checker .affiliate-checker-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: 2px solid #e3e3e3;
        background-color: #f2f2f2;
      }
      #affiliate-checker .affiliate-checker-icon a {
        padding: 4px;
        line-height: 0;
      }
      #affiliate-checker img {
        width: 16px;
        height: 16px;
      }
      #affiliate-checker .affiliate-checker-affiliate .affiliate-checker-info {
        background-color: ${config.colorAffiliate};
      }
      #affiliate-checker .affiliate-checker-not-affiliate .affiliate-checker-info {
        background-color: ${config.colorNotAffiliate};
      }
      #affiliate-checker .affiliate-checker-error .affiliate-checker-info {
        background-color: ${config.colorError};
      }
      #affiliate-checker .affiliate-checker-info {
        display: flex;
        flex-grow: 1;
        padding: 4px;
      }
      #affiliate-checker .affiliate-checker-status {
        flex-grow: 1;
      }
      #affiliate-checker .affiliate-checker-hot {
        padding-left: 4px;
      }
      #affiliate-checker .affiliate-checker-rate {
        padding-left: 4px;
        font-weight: bold;
      }
      .ms-block #affiliate-checker {
        margin-left: 16px;
      }
    `;

    document.head.appendChild(style);

    for (let s of config.services) {
      s = s.toLowerCase();

      if (!services[s]) {
        continue;
      }

      const item = document.createElement('div');
      item.innerHTML = `
        <div class="affiliate-checker-icon">
          <a href="${services[s].url}" target="_self" rel="noopener">
            <img src="${services[s].icon}" alt="${services[s].name[0]}" title="${services[s].name}">
          </a>
        </div>
        <div class="affiliate-checker-info">
          <div class="affiliate-checker-status">Проверка...</div>
        </div>
      `;
      item.className = 'affiliate-checker-item';

      main.appendChild(item);

      services[s].check().then((res) => {
        const status = item.querySelector('.affiliate-checker-status');

        if (!res) {
          status.innerText = 'Не удалось проверить';
          item.classList.add('affiliate-checker-error');
          return;
        }

        const info = item.querySelector('.affiliate-checker-info');

        if (res.affiliate) {
          if (res.hot) {
            const div = document.createElement('div');
            div.className = 'affiliate-checker-hot';
            div.innerText = '🔥';

            info.appendChild(div);
          }
          if (res.rate) {
            const div = document.createElement('div');
            div.className = 'affiliate-checker-rate';
            div.innerText = res.rate;

            info.appendChild(div);
          }

          status.innerText = res.hot ? 'Повышенный кэшбэк' : 'Аффилиатный товар';
          item.classList.add('affiliate-checker-affiliate');
        } else {
          status.innerText = 'Неаффилиатный товар';
          item.classList.add('affiliate-checker-not-affiliate');
        }
      });
    }

    elementSibling.after(main);
  };

  const elementSibling = document.querySelector('[class*=snow-price_SnowPrice__container]');
  const elementPrice = document.querySelector('[class*=snow-price_SnowPrice__mainS]');

  if (elementSibling) {
    if (config.autoCheck) {
      check();
    } else {
      if (elementPrice) {
        elementPrice.addEventListener('click', check);
        elementPrice.style.cursor = 'pointer';
        elementPrice.title = 'Проверить аффилиатность товара';
      }
    }
  }
})();