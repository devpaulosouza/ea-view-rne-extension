// const headers = {
//   Host: "groupcondominios",
//   Referer: "http://groupcondominios/docfinanceiro/",
// };

const headers = new Headers();

headers.append("Host", "groupcondominios");
headers.append("Referer", "http://groupcondominios/docfinanceiro/");

const decodeHtmlCharCodes = (str) =>
  str.replace(/(&#(\d+);)/g, (match, capture, charCode) =>
    String.fromCharCode(charCode)
  );

class RneFetcher {
  constructor() {
    this.uuidMap = new Map();

    this._getLinkFromUuid = this._getLinkFromUuid.bind(this);
    this._putInUuidMap = this._putInUuidMap.bind(this);
    this._fetchUuidMap = this._fetchUuidMap.bind(this);
    this._fetchRne = this._fetchRne.bind(this);
    this.searchRneLinks = this.searchRneLinks.bind(this);
    this.searchRne = this.searchRne.bind(this);
  }

  _getLinkFromUuid(uuid) {
    const key = uuid.slice(0, 2).toLowerCase();

    const path = this.uuidMap.get(key).get(uuid);

    return `http://groupcondominios/docfinanceiro/EARoot/${path}`;
  }

  _putInUuidMap(textUuid = "") {
    if (textUuid) {
      const startPos = textUuid?.indexOf("/");

      const uuid = textUuid.substring(0, startPos);
      const path = textUuid.substring(startPos + 1, textUuid.length - 2);

      const key = uuid.slice(0, 2).toLowerCase();

      if (!this.uuidMap.has(key)) {
        const uuidList = new Map();

        this.uuidMap.set(key, uuidList);
      }

      this.uuidMap.get(key).set(uuid, path);
    }
  }

  async _fetchUuidMap(uuid) {
    const key = uuid.slice(0, 2).toLowerCase();

    if (this.uuidMap.has(key)) {
      return;
    }

    const res = await fetch(
      `http://groupcondominios/docfinanceiro/js/data/guidmaps/GuidMap${key}.xml`,
      {
        headers,
      }
    );
    const uuidMapList = ((await res.text()) || "").split("\n");

    return uuidMapList;
  }

  async _fetchRne(link) {
    const res = await fetch(link, {
      headers,
    });

    const page = await res.text();
    const html = new DOMParser().parseFromString(page, "text/html");

    return html;
  }

  _extractUuid(href = "") {
    const startPos = href?.lastIndexOf("{") + 1;
    const endPos = href?.lastIndexOf("}");
    return href?.substring(startPos, endPos);
  }

  _extractTitle(text = "") {
    let title = "";
    const startPos = text.indexOf('"');

    if (startPos !== -1) {
      title = text.substring(startPos + 1, text.length);
      title = title.substring(0, title.indexOf('",'));
    }

    return title;
  }

  async searchRneLinks(element) {
    const href = element.href;

    const uuid = this._extractUuid(href);

    const uuidMapList = (await this._fetchUuidMap(uuid)) || [];

    uuidMapList.forEach(this._putInUuidMap);
  }

  async searchRne(element, uuidMap) {
    const href = element.href;

    const uuid = this._extractUuid(href);

    const link = this._getLinkFromUuid(uuid, uuidMap);

    const page = await this._fetchRne(link);

    let rneTitle =
      page.querySelector(".ObjectTitle > script")?.textContent || "";

    rneTitle = this._extractTitle(rneTitle);

    const rne = page
      .querySelector(".ObjectDetailsNotes")
      ?.innerHTML?.replace("&lt;br/&gt;", "");

    return { rneTitle, rne };
  }
}

window.addEventListener("load", () => {
  const rneFetcher = new RneFetcher();

  setTimeout(() => {
    setInterval(async () => {
      const eaDocument = document.getElementById("contentIFrame").contentWindow
        .document;

      let rneLinks = Array.from(
        eaDocument.querySelectorAll(
          ".ObjectDetailsNotes > ol > li > a:not(.ea-group-rne)"
        )
      );
      rneLinks.forEach((element) => element.classList.add("ea-group-rne"));

      if (rneLinks.length > 5) {
        rneLinks = rneLinks.slice(0, 5);
      }

      if (rneLinks.length) {
        for (let element of rneLinks) {
          await rneFetcher.searchRneLinks(element);
          const rne = await rneFetcher.searchRne(element);

          console.log(rne);
        }
      }
    }, 4000);
  }, 3000);
});

setInterval(() => {}, 1000);
