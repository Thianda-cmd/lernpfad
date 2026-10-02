/** Ein Fortschritt im alten Format (Version 2, ohne Zeitstempel), wie er vor dem Abgleich über Blob gespeichert wurde. */
localStorage.setItem(
  'lernlabor-fortschritt',
  JSON.stringify({
    state: {
      learned: { mitochondrium: true, golgi: true },
      viewed: { mitochondrium: 3 },
      recent: [
        { path: '/mathematik/terme', title: 'Terme vereinfachen' },
        { path: '/chemie/molmasse', title: 'Molare Masse' },
      ],
    },
    version: 2,
  }),
)
export {}
