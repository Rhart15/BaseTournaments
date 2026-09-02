import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const venue = await prisma.venue.create({
    data: {
      name: "Burns Park Sports Complex",
      address: "1 Funland Dr",
      city: "North Little Rock",
      state: "AR",
      fieldCount: 8,
    },
  });

  const tournament = await prisma.tournament.create({
    data: {
      name: "Fall Classic Softball Showdown",
      sport: "SOFTBALL",
      startDate: new Date("2026-10-10"),
      endDate: new Date("2026-10-11"),
      venueId: venue.id,
      city: "North Little Rock",
      entryFeeCents: 45000,
      teamCap: 16,
      description:
        "Pool play into single-elimination bracket. Gate admission and team insurance available on-site.",
    },
  });

  const division = await prisma.division.create({
    data: {
      tournamentId: tournament.id,
      label: "10U Gold",
      ageLimit: 10,
    },
  });

  const teamNames = [
    "Arkansas Blackout",
    "River City Fury",
    "Delta Diamonds",
    "Ozark Outlaws",
    "Rock City Rattlers",
    "Natural State Ninjas",
  ];

  const registrations = [];
  for (const name of teamNames) {
    const reg = await prisma.registration.create({
      data: {
        tournamentId: tournament.id,
        divisionId: division.id,
        teamName: name,
        coachName: "Coach " + name.split(" ")[0],
        coachEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        coachPhone: "501-555-0100",
        status: "PAID",
        paidAt: new Date(),
        poolWins: Math.floor(Math.random() * 3),
        poolLosses: Math.floor(Math.random() * 2),
        runsFor: Math.floor(Math.random() * 20) + 5,
        runsAgainst: Math.floor(Math.random() * 15) + 3,
      },
    });
    registrations.push(reg);
  }

  console.log(
    `Seeded 1 tournament, 1 division, ${registrations.length} teams.`
  );

  // --- Directors / teams / players -------------------------------
  const director = await prisma.director.create({
    data: {
      name: "Marcus Whitfield",
      email: "marcus@basetournament.com",
      phone: "501-555-0111",
      region: "Central Arkansas",
      bio: "Running BASE events across Central Arkansas since 2023.",
      sanctionFeePaid: true,
      backgroundCheckStatus: "APPROVED",
    },
  });

  const team = await prisma.team.create({
    data: {
      name: "Arkansas Blackout",
      organization: "Arkansas Blackout Softball",
      directorId: director.id,
      ageGroup: "10U Gold",
      homeCity: "Clinton",
      homeState: "AR",
      insuranceStatus: "APPROVED",
      insuranceProvider: "Chappell Insurance",
      insuranceExpiresAt: new Date("2027-01-01"),
    },
  });

  await prisma.player.createMany({
    data: [
      {
        teamId: team.id,
        firstName: "Ava",
        lastName: "Johnson",
        jerseyNumber: "7",
        position: "SS",
        birthYear: 2016,
        backgroundCheckStatus: "APPROVED",
      },
      {
        teamId: team.id,
        firstName: "Riley",
        lastName: "Carter",
        jerseyNumber: "12",
        position: "P",
        birthYear: 2015,
        backgroundCheckStatus: "APPROVED",
      },
      {
        teamId: team.id,
        firstName: "Sophia",
        lastName: "Martinez",
        jerseyNumber: "3",
        position: "1B",
        birthYear: 2016,
        backgroundCheckStatus: "SUBMITTED",
      },
    ],
  });

  // --- Age chart ----------------------------------------------------
  await prisma.ageChartEntry.createMany({
    data: [
      { division: "8U", birthYearStart: 2017, birthYearEnd: 2018, sport: "SOFTBALL", sortOrder: 1 },
      { division: "10U", birthYearStart: 2015, birthYearEnd: 2016, sport: "SOFTBALL", sortOrder: 2 },
      { division: "12U", birthYearStart: 2013, birthYearEnd: 2014, sport: "SOFTBALL", sortOrder: 3 },
      { division: "14U", birthYearStart: 2011, birthYearEnd: 2012, sport: "SOFTBALL", sortOrder: 4 },
      { division: "8U", birthYearStart: 2017, birthYearEnd: 2018, sport: "BASEBALL", sortOrder: 1 },
      { division: "10U", birthYearStart: 2015, birthYearEnd: 2016, sport: "BASEBALL", sortOrder: 2 },
      { division: "12U", birthYearStart: 2013, birthYearEnd: 2014, sport: "BASEBALL", sortOrder: 3 },
      { division: "14U", birthYearStart: 2011, birthYearEnd: 2012, sport: "BASEBALL", sortOrder: 4 },
    ],
  });

  // --- Coach's Corner posts ------------------------------------------
  await prisma.post.create({
    data: {
      title: "Welcome to the new BASE website",
      slug: "welcome-to-the-new-base-website",
      excerpt: "A quick look at what's new for teams and directors this season.",
      body: "We're excited to launch the new BASE Events platform. Teams can now register and pay online, track their pool-play results, and follow live brackets from any device. Directors get a streamlined dashboard for managing tournaments end to end.\n\nMore updates are coming soon — stay tuned to Coach's Corner for tips, rule clarifications, and season announcements.",
      publishedAt: new Date(),
    },
  });

  console.log("Seeded directors, teams, players, age chart, and posts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
