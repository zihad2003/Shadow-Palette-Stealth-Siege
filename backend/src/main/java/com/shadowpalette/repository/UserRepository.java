package com.shadowpalette.repository;

import com.shadowpalette.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    List<User> findByUsernameContainingIgnoreCase(String username);

    @Query("SELECT COALESCE(MAX(u.id), 0) FROM User u")
    long findMaxId();
}
