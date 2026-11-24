/*
  SAYT SOZLAMALARI
  ----------------
  Reyestr yozuvlari js/reyestr.js faylida — u Excel'dan avtomatik yaratiladi:
      npm run import -- "C:\yoʻl\Tadbirkorlar_roʻyxati.xlsx"

  Bu yerda esa qoʻlda tahrirlanadigan narsalar:
  - mahallalar: murojaat formasidagi hududlar (kirillda yoziladi, lotinga avtomatik oʻgiriladi)
  - sohalar roʻyxati va barcha matnlar tarjimasi: js/i18n.js
  - UCHRASHUVLAR: eʼlon qilinadigan kelgusi uchrashuvlar (boʻsh boʻlsa boʻlim koʻrinmaydi)
      { id: "2026-12-05", sana: "2026-12-05", vaqt: "10:00",
        joy: "Tuman hokimligi majlislar zali", mavzu: "Investitsiya loyihalari" }
*/

window.SITE = {
  mahallalar: [
    "Водил", "Чимён", "Шоҳимардон", "Оқбилол", "Қўрғонтепа", "Юқори Арча", "Деҳқонобод",
    "Дўстлик", "Барқарор", "Беруний", "Гулистон", "Ёйилма", "Миндонобод", "Каптархона",
    "Саткак", "Саноат", "Гулпиён", "Хонқиз", "Обод", "Бошқа"
  ]
};

window.UCHRASHUVLAR = [];
