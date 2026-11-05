const { logger } = require('../utils/logger');

/**
 * Middleware para validar se o usuário autenticado possui privilégios de administrador.
 * O e-mail do administrador é configurado exclusivamente via variável de ambiente (ADMIN_EMAIL).
 */
const adminAuth = (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: 'Autenticação necessária' });
    }

    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : '';

    if (!adminEmail) {
      logger.error('ADMIN_EMAIL não configurado nas variáveis de ambiente');
      return res.status(500).json({ message: 'Configuração de administrador pendente no servidor' });
    }

    const userEmail = req.user.email.toLowerCase().trim();

    if (userEmail !== adminEmail) {
      logger.warn(`Tentativa de acesso não autorizado à rota administrativa por: ${userEmail}`);
      return res.status(403).json({ message: 'Acesso negado. Apenas o administrador pode realizar esta operação.' });
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware adminAuth:', error);
    res.status(500).json({ message: 'Erro interno na validação de permissões' });
  }
};

module.exports = adminAuth;

