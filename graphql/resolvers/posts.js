const { AuthenticationError, UserInputError } = require('apollo-server');

const Post = require('../../models/Post');
const User = require('../../models/User');
const checkAuth = require('../../util/check-auth');


module.exports = {
    Query: {
        // Gets all posts from the database
        async getPosts(){
            try {
                const posts = await Post.find().sort({ createdAt: -1 });
                return posts;
            } catch (err) {
                throw new Error(err);
            }
        },
        // Gets a single post (by ID) from the database
        async getPost(_, { postId }) {
            try {
                const post = await Post.findById(postId);
                if (post) {
                    return post;
                } else {
                    throw new Error ('Post not found');
                } 
            } catch (err) {
                throw new Error(err);
            }
        }
    },
    Mutation: {
        // Creates a post and saves it into the database
        async createPost(_, { body }, context) {
            const user = checkAuth(context);
            console.log(user);

            const newPost = new Post({
                body,
                user: user.id,
                username: user.username,
                createdAt: new Date().toISOString()
            });

            const post = await newPost.save();

            context.pubsub.publish('NEW_POST', {
                newPost: post
            })

            return post;
        },
        // Deletes a post (by ID) from the database
        async deletePost(_, { postId }, context) {
            const user = checkAuth(context);

            try {
                const post = await Post.findById(postId);
                if (user.username === post.username) {
                    await post.delete();
                    return 'Post deleted successfully';
                } else {
                    throw new AuthenticationError('Action not allowed');
                }
            } catch (err) {
                throw new Error(err);
            }
        },
        // Toggles between liking and unliking a post each time it is called
        async likePost(_, { postId }, context) {
            const { username } = checkAuth(context);

            const post = await Post.findById(postId);
            if (post) {
                if (post.likes.find(like => like.username === username)) {
                    // Post already liked, unlike it
                    post.likes = post.likes.filter(like => like.username !== user);
                } else {
                    //Not liked, like post
                    post.likes.push({
                        username,
                        createdAt: new Date().toISOString()
                    })
                }

                await post.save();
                return post;
            } else {
                throw new UserInputError('Post not found');
            }
        }
    },
    Subscription: {
        newPost: {
            subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('NEW_POST')
        }
    }
}