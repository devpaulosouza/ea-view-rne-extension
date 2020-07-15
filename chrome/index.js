const { href, host } = window.location;

const headers = new Headers();

headers.append("Host", host);
headers.append("Referer", href);

const tooltipStyles = `
.tooltip-group {
  display: inline-block;
  position: relative;
  margin: 0 auto;
}

[data-tooltip-id] {
  width: 400px;
  position: absolute;
  display: none;
  background: black;
  color: white;
  top: -60px;
  margin-left: -15px;
  border-radius: 5px;
  padding: 15px;
  z-index: 999;
}
[data-tooltip-id] > *{
  color: white
}
`;

/*
 * Credits https://stackoverflow.com/a/1349426/8753437
 */
const makeId = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

/*
 * "Creative" solution https://stackoverflow.com/a/42182294/8753437
 */
const decodeHtml = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

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

    return `${href}/EARoot/${path}`;
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
      return [];
    }

    const res = await fetch(`${href}/js/data/guidmaps/GuidMap${key}.xml`, {
      headers,
    });
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

    let title = page.querySelector(".ObjectTitle > script")?.textContent || "";

    title = this._extractTitle(title);

    const description = page.querySelector(".ObjectDetailsNotes")?.innerHTML;

    return { title, description, id: makeId(12), uuid };
  }
}

window.addEventListener("load", () => {
  const rneFetcher = new RneFetcher();

  setTimeout(() => {
    setInterval(async () => {
      try {
        const eaDocument = document.getElementById("contentIFrame")
          .contentWindow.document;

        const styleSheet = eaDocument.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = tooltipStyles;
        eaDocument.head.appendChild(styleSheet);

        let rneLinks = Array.from(
          eaDocument.querySelectorAll(
            ".ObjectDetailsNotes > ol > li > a:not(.ea-view-rne)"
          )
        );
        rneLinks.forEach((element) => element.classList.add("ea-view-rne"));

        if (rneLinks.length) {
          for (let element of rneLinks) {
            await rneFetcher.searchRneLinks(element);
            const rne = await rneFetcher.searchRne(element);

            if (rne?.description) {
              const popoverWrapper = document.createElement("div");

              popoverWrapper.id = rne.id;
              popoverWrapper.classList.add("tooltip-group");

              element.parentNode.insertBefore(popoverWrapper, element);
              popoverWrapper.appendChild(element);

              /*
               * Tooltip 's credits https://stackoverflow.com/a/42180786/8753437
               */
              const popoverHtml = new DOMParser().parseFromString(
                `
              <div data-tooltip-id="${rne.id}">
                <h2>${rne.title}</h2><p></p>
                <br />
                <a href="javascript:top.guidLink('{${rne.uuid}}')">Mostrar na página</a>
              </div>
              `,
                "text/html"
              );
              const popoverNodeElement = popoverHtml.body.firstElementChild;

              const descriptionNodeElement = new DOMParser().parseFromString(
                `<div>${decodeHtml(rne.description)}</div>`,
                "text/html"
              ).body.firstElementChild;

              popoverHtml
                .querySelector("p")
                .appendChild(descriptionNodeElement);

              popoverWrapper.appendChild(popoverNodeElement);

              popoverWrapper.addEventListener("mouseover", () => {
                popoverNodeElement.style.display = "block";
              });

              popoverNodeElement.addEventListener("mouseout", () => {
                popoverNodeElement.style.display = "none";
              });
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);
  }, 3000);
});

setInterval(() => {}, 1000);
