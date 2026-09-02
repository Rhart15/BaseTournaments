import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedTournament = {
  name: string;
  sport: "SOFTBALL" | "BASEBALL";
  startDate: string;
  endDate: string;
  city: string;
  divisions: string[];
  entryFeeCents: number;
  teamCap: number;
  description: string;
};

const tournaments: SeedTournament[] = [
  {
    name: "Battle in the Bluff",
    sport: "SOFTBALL",
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    city: "Pine Bluff, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 30000,
    teamCap: 24,
    description: "4-game guarantee. Awards: 1st-3rd place.",
  },
  {
    name: "BASE College Exposure Tournament",
    sport: "SOFTBALL",
    startDate: "2026-11-14",
    endDate: "2026-11-15",
    city: "Hot Springs, AR",
    divisions: ["12U", "14U", "16U", "18U", "Open"],
    entryFeeCents: 50000,
    teamCap: 24,
    description: "4-game guarantee. College showcase format.",
  },
  {
    name: "Blue Collar Brawl",
    sport: "SOFTBALL",
    startDate: "2026-09-05",
    endDate: "2026-09-05",
    city: "Muskogee, OK",
    divisions: ["10U", "Open"],
    entryFeeCents: 27500,
    teamCap: 16,
    description: "Love-Hatbox Sports Complex. 3-game guarantee. Awards: 1st and 2nd. Sold out, coming back soon.",
  },
  {
    name: "Water Tower Wars",
    sport: "SOFTBALL",
    startDate: "2026-09-05",
    endDate: "2026-09-05",
    city: "Pocahontas, AR",
    divisions: ["10U", "Open"],
    entryFeeCents: 26500,
    teamCap: 16,
    description: "Sold out, registration closed.",
  },
  {
    name: "9/11 Remember The Heroes",
    sport: "SOFTBALL",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    city: "Texarkana, TX",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "Open", "Rec"],
    entryFeeCents: 27500,
    teamCap: 24,
    description: "",
  },
  {
    name: "Bombs in the Bluff",
    sport: "SOFTBALL",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    city: "Poplar Bluff, MO",
    divisions: ["8U", "9U", "10U", "12U", "14U", "Open"],
    entryFeeCents: 26500,
    teamCap: 24,
    description: "McLane Park.",
  },
  {
    name: "CBC Fall Classic",
    sport: "SOFTBALL",
    startDate: "2026-09-12",
    endDate: "2026-09-13",
    city: "Conway, AR",
    divisions: ["6U", "8U", "10U", "12U", "14U", "16U", "18U", "Open"],
    entryFeeCents: 30000,
    teamCap: 32,
    description: "City of Colleges Park. 3-game guarantee. Awards: rings, NIT, first place free entry into Nationals or Worlds.",
  },
  {
    name: "South AR BASE Fall Classic",
    sport: "SOFTBALL",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    city: "El Dorado, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 29000,
    teamCap: 24,
    description: "El Dorado Recreation Complex.",
  },
  {
    name: "Yella Ball Drake Tournament",
    sport: "SOFTBALL",
    startDate: "2026-09-19",
    endDate: "2026-09-20",
    city: "Russellville / Conway / Majestic, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 10000,
    teamCap: 40,
    description: "4-game guarantee.",
  },
  {
    name: "BASES at the Beach",
    sport: "SOFTBALL",
    startDate: "2026-09-26",
    endDate: "2026-09-26",
    city: "Ocean Springs, MS",
    divisions: ["10U", "12U", "14U", "16U", "Open"],
    entryFeeCents: 30000,
    teamCap: 16,
    description: "3-game guarantee.",
  },
  {
    name: "Out of the Park Palooza",
    sport: "SOFTBALL",
    startDate: "2026-09-26",
    endDate: "2026-09-26",
    city: "Cabot / Bryant, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 30000,
    teamCap: 24,
    description: "3-game guarantee.",
  },
  {
    name: "September Slugfest",
    sport: "SOFTBALL",
    startDate: "2026-09-26",
    endDate: "2026-09-26",
    city: "Shreveport, LA",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "Open"],
    entryFeeCents: 27500,
    teamCap: 24,
    description: "Caddo Parish Premier Park.",
  },
  {
    name: "BASE Arkansas Fall STATE",
    sport: "SOFTBALL",
    startDate: "2026-10-03",
    endDate: "2026-10-04",
    city: "Russellville / Bryant, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 39500,
    teamCap: 32,
    description: "State championship weekend.",
  },
  {
    name: "October Throwdown",
    sport: "SOFTBALL",
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    city: "Texarkana, TX",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "Open"],
    entryFeeCents: 27500,
    teamCap: 24,
    description: "",
  },
  {
    name: "Oklahoma Fall State",
    sport: "SOFTBALL",
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    city: "Tahlequah, OK",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "Open", "C"],
    entryFeeCents: 50000,
    teamCap: 24,
    description: "3-game guarantee. Awards: 1st-3rd. Registration closed.",
  },
  {
    name: "Dia de los Dingers",
    sport: "SOFTBALL",
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    city: "Pocahontas, AR",
    divisions: ["8U", "9U", "10U", "12U", "14U", "Open"],
    entryFeeCents: 26500,
    teamCap: 24,
    description: "",
  },
  {
    name: "Nashville Knockout",
    sport: "SOFTBALL",
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    city: "Nashville, AR",
    divisions: ["8U", "9U", "10U", "12U", "14U", "Open"],
    entryFeeCents: 27500,
    teamCap: 24,
    description: "",
  },
  {
    name: "Minden Meltdown",
    sport: "SOFTBALL",
    startDate: "2026-10-17",
    endDate: "2026-10-17",
    city: "Minden, LA",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "Open"],
    entryFeeCents: 27500,
    teamCap: 24,
    description: "",
  },
  {
    name: "THE CALL CLASSIC",
    sport: "SOFTBALL",
    startDate: "2026-10-17",
    endDate: "2026-10-17",
    city: "El Dorado, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 25000,
    teamCap: 24,
    description: "",
  },
  {
    name: "THE HOWLER",
    sport: "SOFTBALL",
    startDate: "2026-10-17",
    endDate: "2026-10-17",
    city: "Conway / Russellville / Hot Springs, AR",
    divisions: ["6U", "8U", "9U", "10U", "12U", "14U", "16/18U", "Open"],
    entryFeeCents: 32500,
    teamCap: 32,
    description: "",
  },
  {
    name: "BASE BOO Ball on the Bay",
    sport: "SOFTBALL",
    startDate: "2026-10-24",
    endDate: "2026-10-24",
    city: "Ocean Springs, MS",
    divisions: ["10U", "12U", "14U", "16U", "Open"],
    entryFeeCents: 30000,
    teamCap: 16,
    description: "3-game guarantee.",
  },
  {
    name: "Fall in love with BASEball Kickoff",
    sport: "BASEBALL",
    startDate: "2026-09-20",
    endDate: "2026-09-20",
    city: "Arkansas",
    divisions: ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "Open", "A", "AA", "AAA"],
    entryFeeCents: 27500,
    teamCap: 24,
    description:
      "Bishop Park. 3-game guarantee. Awards: rings and banners to 1st and 2nd. Teams must play three tournaments before official classification.",
  },
  {
    name: "Oklahoma Fall State - Baseball",
    sport: "BASEBALL",
    startDate: "2026-10-03",
    endDate: "2026-10-04",
    city: "Oklahoma",
    divisions: ["6U", "8U", "10U", "12U", "14U", "16U", "Open"],
    entryFeeCents: 50000,
    teamCap: 24,
    description: "Love-Hat Box.",
  },
];

async function main() {
  let tournamentCount = 0;
  let divisionCount = 0;

  for (const t of tournaments) {
    const created = await prisma.tournament.create({
      data: {
        name: t.name,
        sport: t.sport,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate),
        city: t.city,
        entryFeeCents: t.entryFeeCents,
        teamCap: t.teamCap,
        description: t.description || null,
      },
    });
    tournamentCount++;

    for (const label of t.divisions) {
      await prisma.division.create({
        data: { tournamentId: created.id, label },
      });
      divisionCount++;
    }
  }

  console.log(
    `Seeded ${tournamentCount} real current BASE tournaments with ${divisionCount} divisions.`
  );

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

  await prisma.post.create({
    data: {
      title: "Welcome to the new BASE website",
      slug: "welcome-to-the-new-base-website",
      excerpt: "A quick look at what's new for teams and directors this season.",
      body: "We're excited to launch the new BASE Events platform. Teams can now register and pay online, track their pool-play results, and follow live brackets from any device. Directors get a streamlined dashboard for managing tournaments end to end.\n\nMore updates are coming soon - stay tuned to Coach's Corner for tips, rule clarifications, and season announcements.",
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