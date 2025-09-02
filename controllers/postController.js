const Post = require("../models/postModel");
const { isValidObjectId } = require("mongoose");
const { getImageFromUnsplash } = require("../utils/functions.js");
const Comment = require("../models/commentModel.js")




exports.createPost = async (req, res) => {
  try {
    const { title, description, category, tags, selectedImage } = req.body;
    if (!req.user) {
      return res.status(401).json({ result: false, error: "Not Authorized" });
    }

    const keywords =
      tags && tags.length > 0
        ? tags.split(",").map((tag) => tag.trim())
        : [title];

    const imagePaths = selectedImage
      ? [selectedImage]
      : await getImageFromUnsplash(keywords);

    const newPost = new Post({
      title,
      description,
      category,
      imagePath: imagePaths,
      tags,
      userId: req.user.id,
    });

    const savedPost = await newPost.save();

    res.status(201).json({ message: "Post créé", savedPost });
  } catch (error) {
    console.error("Erreur lors de la création du post:", error);
    res.status(500).json({ message: "Erreur du serveur" });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 40;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const posts = await Post.find()
      .populate("userId", "username")
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des posts" });
  }
};

// Déclare une fonction asynchrone appelée "getPostsUser", exportée pour être utilisée ailleurs.
exports.getPostsUser = async (req, res) => {
  try {
    // Récupère l'identifiant de l'utilisateur connecté depuis l'objet req (par ex. via un middleware d'authentification).
    const userId = req.user.id;

    // Récupère "startIndex" depuis les paramètres de requête (req.query). 
    // Si absent ou invalide, la valeur par défaut sera 0. (parseInt convertit en nombre).
    const startIndex = parseInt(req.query.startIndex) || 0;

    // Définit la direction du tri : si "order=asc", alors 1 (croissant), sinon -1 (décroissant).
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    // Recherche les posts dans la collection "Post" dont l'auteur correspond à l'userId.
    // - .populate("author", "username") : remplace l'ID de l'auteur par ses infos, mais seulement le champ "username".
    // - .sort({ updatedAt: sortDirection }) : trie les résultats par date de mise à jour, asc ou desc.
    // - .skip(startIndex) : ignore les X premiers résultats, utile pour la pagination.
    const posts = await Post.find({ author: userId })
      .populate("author", "username")
      .sort({ updatedAt: sortDirection })
      .skip(startIndex);
      console.log("Posts server + ",posts);
      

    // Renvoie la liste des posts trouvés au client avec un code HTTP 200 (OK).
    res.status(200).json(posts);
  } catch (error) {
    // En cas d'erreur (par ex. problème de base de données), affiche l'erreur dans la console serveur.
    console.error(error);

    // Et renvoie une réponse HTTP 500 (erreur interne serveur) avec un message JSON.
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des posts" });
  }
};


exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: "Article introuvable" });
    }

    res.json({ posts: [post] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur" });
  }
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, description, tags, selectedImage } = req.body;

  try {
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post non trouvé" });
    }

    post.title = title;
    post.description = description;
    post.tags = tags;
    post.imagePath = selectedImage;

    await post.save();

    res.status(200).json({ message: "Post mis à jour avec succès", post });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du post", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post introuvable" });
    }

    if (!post.author) {
      return res
        .status(500)
        .json({ message: "Données invalides dans le post" });
    }

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Vous n'êtes pas autorisé à supprimer ce post" });
    }

    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Le post a été supprimé" });
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
    res.status(500).json({ message: "Erreur du serveur" });
  }
};

exports.getImages = async (req, res) => {
  const { tags } = req.query;

  if (!tags || tags.trim().length === 0) {
    return res.status(400).json({
      message: "Veuillez fournir des mots-clés pour rechercher des images.",
    });
  }

  try {
    const keywords = tags.split(",").map((tag) => tag.trim());
    const imagePaths = await getImageFromUnsplash(keywords);

    if (imagePaths.length === 0) {
      return res.status(404).json({ message: "Aucune image trouvée." });
    }

    res.status(200).json({ imagePaths });
  } catch (error) {
    console.error("Erreur lors de la recherche des images", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};





exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id; // Utilisateur connecté

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post non trouvé" });
    }

   
    if (post.likes.includes(userId)) {
      return res.status(400).json({ message: "Vous avez déjà aimé ce post" });
    }

   
    post.likes.push(userId);
    await post.save();

    res.status(200).json({ message: "Post liké", likes: post.likes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};



exports.commentPost = async (req, res) => {
  try {
    const { content } = req.body;

    const postId = req.params.postId;
   
    

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas être vide.' });
    }

    
    const newComment = new Comment({
      postId,
      userId: req.user.id, 
      content,
    });

    const savedComment = await newComment.save();

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: savedComment._id } },
      { new: true }
    ).populate('comments');

    res.status(200).json(updatedPost); // Retourner le post mis à jour avec les commentaires
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Une erreur interne est survenue' });
  }
};









