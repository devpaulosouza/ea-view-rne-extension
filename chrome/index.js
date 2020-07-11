// const headers = {
//   Host: "groupcondominios",
//   Referer: "http://groupcondominios/docfinanceiro/",
// };

const headers = new Headers();

headers.append("Host", "groupcondominios");
headers.append("Referer", "http://groupcondominios/docfinanceiro/");

const fetchUuidMap = async (uuid) => {
  const first = uuid.slice(0, 2).toLowerCase();
  const res = await fetch(
    `http://groupcondominios/docfinanceiro/js/data/guidmaps/GuidMap${first}.xml`,
    {
      headers,
    }
  );
  const uuidMap = await res.text();
  console.log("uwu", uuidMap);
};

window.addEventListener("load", () => {
  console.log(document.getElementById("contentIFrame").contentWindow.document);
  setTimeout(() => {
    setInterval(() => {
      const eaDocument = document.getElementById("contentIFrame").contentWindow
        .document;
      console.log(
        eaDocument.querySelectorAll(".ObjectDetailsNotes > ol > li > a")
      );
    }, 4000);
  }, 3000);
});

setInterval(() => {}, 1000);
