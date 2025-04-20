const connection = require('../app/database')

const {
  // routes,
  superadminMenu,
  adminMenu
} = require('../app/menu')

const { czhAdminPhone } = require('../app/config')

const logger = require('../utils/logger')

class MenuService {
  async getMenuList(params) {
    const { thePhone } = params

    try {
      let menu = null
      if (thePhone === czhAdminPhone) {
        menu = superadminMenu
      } else {
        menu = adminMenu
      }

      return {
        // routes,
        menu,
      }
    } catch (error) {
      logger.error('service', 'service error: getMenuList', { error, thePhone })

      throw error
    }
  }
}

module.exports = new MenuService()