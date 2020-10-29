module.exports = [
  {
    id: 'test',
    params: {
      title: 'test',
    },
    connections: [
      {
        id: 'crm',
        type: 'crm',
        crm: 'custom',
        params: {
          url: 'http://localhost:3000/api',
          auth: 'key',
          key: '3285094054305',
        },
      },
      {
        id: 'email-yandex',
        type: 'email',
        params: {
          name: 'test@test.ru',
          password: '1234',
        }
      }
    ],
    steps: [
      {
        id: 'start',
        type: 'start',
        out: 'httpRequestParams',
        next: 'exec-httprequest',
      },
      {
        id: 'exec-httprequest',
        type: 'executor',
        executor: 'httprequestExecutor',
        params: {
          validate: true,
          connectionId: 'crm',
        },
        next: 'selector-one',
      },
      {
        id: 'selector-one',
        type: 'selector',
        selector: 'successFailSelector',
        params: {
          list: {
            'success': 'successmodificator-email1',
            'fail': 'failmodificator-email2'
          },
        },
      },
      {
        id: 'successmodificator-email1',
        type: 'modificator',
        modificator: 'successhttprequest2emailModificator',
        next: 'executor-email',
      },
      {
        id: 'failmodificator-email2',
        type: 'modificator',
        modificator: 'failhttprequest2email',
        next: 'executor-email',  
      },
      {
        id: 'executor-email',
        type: 'executor',
        executor: 'email',
      },
      {
        id: 'executor-email',
        type: 'end',
        executor: 'email',
      },
    ],
  },
]