require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { connectDB, disconnectDB } = require('./config/db');
const prisma = require('./prismaClient');

async function main() {
  await connectDB();

  const users = await prisma.user.count();
  const products = await prisma.product.count();
  const orders = await prisma.order.count();
  console.log('DOCS:', { users, products, orders });

  const user = await prisma.user.findFirst({ where: { username: 'admin01' } });
  console.log('USER_FOUND:', !!user, user ? user.username : '');

  const listing = await prisma.product.findMany({
    where: { published: true, NOT: { status: { in: ['draft', 'archived'] } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, handle: true, variants: true, images: { select: { src: true }, take: 1 }, badge: true, productCategory: true, navPage: true, rating: true, reviewCount: true }
  });
  console.log('LISTING_COUNT:', listing.length);
  if (listing[0]) console.log('LISTING_FIRST_TITLE:', listing[0].title, 'IMG_HANDLE_OK:', Array.isArray(listing[0].images));

  await disconnectDB();
  process.exit(0);
}

main().catch((e) => { console.error('SMOKE_FAIL', e); process.exit(1); });