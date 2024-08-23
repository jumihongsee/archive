function checkLogin(req,res,next){
    if(!req.user){
        res.render('login.ejs')
    }else{
        const LogInUser = req.user ;
    }
    
       
    next()
}

module.exports = checkLogin