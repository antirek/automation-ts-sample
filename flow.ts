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
        type: 'validate',        
        next: () => {
          return 2;
        },
      },
      {
        id: 2,
        type: 'httprequest',        
        params: {
          validate: true,
          connectionId: 'crm',
        },
        next: (res) => {
          const status = res.status;
          const q = [
            {
              status: 'success',
              stepId: 4,
            },
            {
              status: 'fail',
              stepId: 3,
            },
          ];
          const n = q.find(i => i.status === status);
          return n.stepId;
        }
      },
      {
        id: 3,
        type: 'email',        
        params: {
          to: 'vasya@test.ru',
          connectionId: 'email-yandex',
        }        
      },
      {
        id: 4,
        type: 'select',
        params: {
          checkField: 'status',
          variants: [
            {
              status: 'stable',
              stepId: 'cache',
            },{
              status: 'another-worlds',
              stepId: 2,
            },
          ],
        },
        next: (data) => {
          return data;;
        }
      },
    ],
  },
]