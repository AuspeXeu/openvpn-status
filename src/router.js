import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router);

export default new Router({
  routes: [
    { path: '/:id/:view' },
    { path: '*', redirect: '/0/clients' }
  ]
})
