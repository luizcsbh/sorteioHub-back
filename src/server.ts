import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[SorteioHub Backend] Servidor rodando na porta ${PORT}`);
  console.log(`[SorteioHub Backend] Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
