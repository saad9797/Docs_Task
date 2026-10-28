import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try {
  const users = await Promise.all(['Alice','Bob','Carol','Dave'].map(name => db.user.upsert({where:{email:`${name.toLowerCase()}@example.com`},update:{},create:{name,email:`${name.toLowerCase()}@example.com`}})));
  const samples = [
    {id:'10000000-0000-4000-8000-000000000001',title:'A little room for big ideas',content:'<h1>A little room for big ideas</h1><p>Welcome to Folio, your quiet space to think, write, and work together.</p><h2>Make it yours</h2><ul><li>Give this document a new title.</li><li>Try a heading, a list, or a little emphasis.</li><li>Share an idea with someone else.</li></ul><p>Your changes save automatically as you write.</p>'},
    {id:'10000000-0000-4000-8000-000000000002',title:'Our next chapter',content:'<h1>Our next chapter</h1><p>A shared space for the next good idea.</p><h2>Things to explore</h2><ul><li>What should we try next?</li><li>What have we learned?</li></ul>'},
  ];
  for(const sample of samples) await db.document.upsert({where:{id:sample.id},update:{},create:{...sample,ownerId:users[0].id}});
  await db.documentShare.upsert({where:{documentId_userId:{documentId:samples[1].id,userId:users[1].id}},update:{},create:{documentId:samples[1].id,userId:users[1].id,role:'VIEWER'}});
  console.log('Seeded four demo users and two sample documents.');
} finally { await db.$disconnect(); }
