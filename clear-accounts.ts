import { prisma } from './src/lib/db';

async function clearExistingAccounts() {
  console.log('Clearing all existing accounts that don\'t have passwords...');
  
  try {
    // Delete all data in dependency order
    await prisma.passwordResetToken.deleteMany({});
    await prisma.magicLinkToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.calendarToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.reaction.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.invite.deleteMany({});
    await prisma.rsvp.deleteMany({});
    await prisma.eventCoHost.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.communityMember.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.venue.deleteMany({});
    await prisma.media.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.block.deleteMany({});
    await prisma.profile.deleteMany({});
    
    // Finally delete users
    const deletedUsers = await prisma.user.deleteMany({});
    
    console.log(`Successfully cleared ${deletedUsers.count} user accounts and all related data.`);
    console.log('All users will now need to register with email/password.');
    
  } catch (error) {
    console.error('Error clearing accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearExistingAccounts();