import {
  ApolloServer,
  AuthenticationError,
  gql,
  UserInputError,
} from "apollo-server";
import jwt from "jsonwebtoken";

import connectDB from "./db.js";
import Person from "./models/person.js";
import User from "./models/user.js";

const JWT_SECRET = process.env.JWT_SECRET;

// const persons = [
//   {
//     name: "John",
//     age: 15,
//     phone: "593-123456789",
//     street: "Calle Frontend",
//     city: "Quito",
//     id: "3d5946520-3455-987e2-bc57-1231b231dc3",
//   },
//   {
//     name: "Yourself",
//     age: 20,
//     street: "Avenida siempre viva",
//     city: "Guayaquil",
//     id: "3d512340-7894-672e5-xf68-1321bx31dc4",
//   },
//   {
//     name: "Rayozack",
//     age: 33,
//     phone: "593-123456789",
//     street: "Pasaje Testing",
//     city: "Machala",
//     id: "1231xc32-4567-357e4-xh12-1594zj63ad7",
//   },
// ];

const typeDefs = gql`
  enum YesNo {
    YES
    NO
  }

  type Address {
    street: String!
    city: String!
  }

  type Person {
    name: String!
    age: Int!
    phone: String
    address: Address!
    id: ID!
  }

  type User {
    username: String!
    friends: [Person]!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person]!
    findPerson(name: String!): Person
    me: User
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(name: String, phone: String): Person

    createUser(username: String!): User
    login(username: String!, password: String!): Token
    addAsFriend(name: String!): User
  }
`;

const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (_, args) => {
      if (!args.phone) return Person.find({});

      return await Person.find({ phone: { $exists: args.phone === "YES" } });
    },
    findPerson: async (_, args) => {
      const { name } = args;
      return await Person.findOne({ name });
    },
    me: (_, args, context) => {
      return context.currentUser;
    },
  },

  Mutation: {
    addPerson: async (_, args, context) => {
      const { currentUser } = context;
      if (!currentUser) {
        throw new AuthenticationError("Not Authorized");
      }

      const person = new Person({ ...args });
      try {
        await person.save();
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }

      return person;
    },
    editNumber: async (_, args) => {
      const person = await Person.findOne({ name: args.name });
      if (!person) return;

      person.phone = args.phone;

      try {
        await person.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }

      return person;
    },
    createUser: (_, args) => {
      const user = new User({ username: args.username });

      return user.save().catch((error) => {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      });
    },
    login: async (_, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== "secretpassword") {
        throw new UserInputError("Wrong credentials");
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, JWT_SECRET) };
    },
    addAsFriend: async (_, args, { currentUser }) => {
      if (!currentUser) throw new AuthenticationError("Not Authorized");

      const person = await Person.findOne({ name: args.name });
      const nonFriendlyAlready = (person) =>
        !currentUser.friends.map((p) => p._id).includes(person._id);

      if (nonFriendlyAlready(person)) {
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();
      } else {
        throw new Error("This person was add before as your friend");
      }

      return currentUser;
    },
  },

  Person: {
    address: (root) => ({
      street: root.street,
      city: root.city,
    }),
  },
  // Person: {
  //   canDrink: (root) => root.age > 18,
  //   address: (root) => `${root.street}, ${root.city}`,
  //   check: () => "jonathanludena",
  // },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      const token = auth.substring(7);
      const decodedToken = jwt.verify(token, JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id).populate(
        "friends"
      );

      return { currentUser };
    }
  },
});

server.listen().then(({ url }) => console.log(`Server ready at ${url}`));
connectDB();
