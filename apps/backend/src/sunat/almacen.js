const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// XML y CDR de SUNAT: bucket R2 PRIVADO (el bucket de fotos y logos es público).
function crearAlmacenPrivado({ client, bucket = process.env.R2_PRIVATE_BUCKET, firmar = getSignedUrl } = {}) {
  if (!bucket) throw new Error('Falta R2_PRIVATE_BUCKET: los XML y CDR de SUNAT van en un bucket privado');
  const cliente = () => client || require('../utils/storage').getR2Client();

  return {
    async guardar(key, cuerpo, contentType) {
      await cliente().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: cuerpo, ContentType: contentType }));
      return key;
    },
    async leer(key) {
      const respuesta = await cliente().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await respuesta.Body.transformToByteArray());
    },
    urlFirmada(key, segundos = 300) {
      return firmar(cliente(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: segundos });
    },
  };
}

module.exports = { crearAlmacenPrivado };
